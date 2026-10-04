import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const script = join(projectRoot, 'scripts', 'prepare-photo.mjs');

const entry = {
  id: 'sample-find',
  parkId: 'studios_park',
  landId: 'toy_blocks_area',
  attractionId: 'backyard_coaster',
  display: { entryTitle: 'Sample Find', parkName: 'Studios Park', landName: 'Toy Blocks Area', attractionName: 'Backyard Coaster' },
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the photo preparation tests.',
  whereToLook: { scene: 'A wall', exactSpot: 'The middle of it' },
  createdAtISO: '2026-09-16T00:00:00.000Z',
  updatedAtISO: '2026-09-16T00:00:00.000Z',
};

/**
 * Runs a snippet against sharp in a child process. Jest's module loader and a
 * native addon do not mix, so the fixture is made and inspected the same way
 * the script itself runs.
 */
function sharpEval(code: string, params: Record<string, string>): Record<string, unknown> {
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import sharp from "sharp"; const p = JSON.parse(process.env.P); ${code}`],
    { cwd: projectRoot, encoding: 'utf8', env: { ...process.env, P: JSON.stringify(params) } }
  );
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout.trim());
}

/** A heavy 3000x2000 noise JPEG saved with EXIF orientation 6, as a phone held upright would. */
function writeFixture(path: string) {
  sharpEval(
    `await sharp({ create: { width: 3000, height: 2000, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 60 } } })
       .jpeg({ quality: 95 }).withMetadata({ orientation: 6 }).toFile(p.out);
     console.log(JSON.stringify({ bytes: (await import("node:fs")).statSync(p.out).size }));`,
    { out: path }
  );
}

function inspect(path: string) {
  return sharpEval(
    `const m = await sharp(p.file).metadata();
     console.log(JSON.stringify({ width: m.width, height: m.height, format: m.format, hasExif: Boolean(m.exif), orientation: m.orientation ?? null }));`,
    { file: path }
  ) as { width: number; height: number; format: string; hasExif: boolean; orientation: number | null };
}

let root: string;
let photo: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tlc-photo-'));
  mkdirSync(join(root, 'content', 'entries'), { recursive: true });
  mkdirSync(join(root, 'content', 'images'), { recursive: true });
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(join(root, 'content', 'entries', 'sample-find.json'), `${JSON.stringify(entry, null, 2)}\n`);
  photo = join(root, 'IMG_0001.JPG');
  writeFixture(photo);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TLC_CONTENT_ROOT: root },
  });
}

const readEntry = () => JSON.parse(readFileSync(join(root, 'content', 'entries', 'sample-find.json'), 'utf8'));
const output = () => join(root, 'content', 'images', 'sample-find.jpg');

describe('prepare-photo', () => {
  it('shrinks, rotates, strips, names, and wires in a phone photo', () => {
    expect(statSync(photo).size).toBeGreaterThan(300 * 1024);

    const result = run('sample-find', photo, '--alt', 'Three circles on a wall', '--credit', 'Nick S.');
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);

    expect(statSync(output()).size).toBeLessThanOrEqual(300 * 1024);
    const out = inspect(output());
    expect(out.format).toBe('jpeg');
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(1200);
    // Orientation 6 means the camera was held upright: the landscape pixels
    // become a portrait photo, and the tag that said so is gone with the rest.
    expect(out.height).toBeGreaterThan(out.width);
    expect(out.hasExif).toBe(false);
    expect(out.orientation).toBeNull();

    const updated = readEntry();
    expect(updated.image).toEqual({ file: 'sample-find.jpg', alt: 'Three circles on a wall', credit: 'Nick S.' });
    expect(Object.keys(updated).indexOf('image')).toBe(Object.keys(updated).indexOf('createdAtISO') - 1);
    expect(updated.updatedAtISO).not.toBe(entry.updatedAtISO);

    const generated = readFileSync(join(root, 'src', 'data', 'images.generated.ts'), 'utf8');
    expect(generated).toContain('"sample-find": require("../../content/images/sample-find.jpg"),');
    expect(result.stdout).toContain('metadata stripped');
  });

  it('writes nothing on a dry run', () => {
    const result = run('sample-find', photo, '--alt', 'Three circles on a wall', '--dry-run');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Dry run');
    expect(existsSync(output())).toBe(false);
    expect(readEntry().image).toBeUndefined();
  });

  it('insists on alt text', () => {
    const result = run('sample-find', photo);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--alt is required');
    expect(existsSync(output())).toBe(false);
  });

  it('refuses to overwrite a photo unless told to, then keeps the old alt text if none is given', () => {
    expect(run('sample-find', photo, '--alt', 'First alt').status).toBe(0);
    const again = run('sample-find', photo, '--alt', 'Second alt');
    expect(again.status).toBe(1);
    expect(again.stderr).toContain('--replace');

    const replaced = run('sample-find', photo, '--replace');
    expect(replaced.status).toBe(0);
    expect(readEntry().image.alt).toBe('First alt');
  });

  it('names the entry it cannot find and rejects a file that is not an image', () => {
    expect(run('no-such-find', photo, '--alt', 'x').stderr).toContain('No entry with id "no-such-find"');

    const notes = join(root, 'notes.txt');
    writeFileSync(notes, 'not a photo');
    const result = run('sample-find', notes, '--alt', 'x');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Couldn't read notes.txt as an image");
  });

  it('explains what to do with an HEIC file it cannot decode', () => {
    // Only the container header: enough to be recognised, nothing to decode.
    const heic = join(root, 'IMG_0002.HEIC');
    writeFileSync(heic, Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic', 'ascii'), Buffer.alloc(64)]));
    const result = run('sample-find', heic, '--alt', 'x');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('HEIC');
    expect(result.stderr).toContain('JPEG');
  });
});

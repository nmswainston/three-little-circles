import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getEntryImageSource } from '../src/data/images';
import { getAllEntries } from '../src/data/query';

const script = join(__dirname, '..', 'scripts', 'build-entries.mjs');

const baseEntry = {
  id: 'sample-find',
  parkId: 'studios_park',
  landId: 'toy_blocks_area',
  attractionId: 'backyard_coaster',
  display: { entryTitle: 'Sample Find', parkName: 'Studios Park', landName: 'Toy Blocks Area', attractionName: 'Backyard Coaster' },
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the image validation tests.',
  whereToLook: { scene: 'A wall', exactSpot: 'The middle of it' },
};

// Builds a throwaway project root with one entry and whatever images the test
// wants, then runs the content build against it.
function build(entry: Record<string, unknown>, images: Record<string, number | Buffer> = {}, args: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'tlc-images-'));
  mkdirSync(join(root, 'content', 'entries'), { recursive: true });
  mkdirSync(join(root, 'content', 'images'), { recursive: true });
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(join(root, 'content', 'entries', `${entry.id}.json`), JSON.stringify(entry));
  for (const [name, content] of Object.entries(images)) {
    writeFileSync(join(root, 'content', 'images', name), typeof content === 'number' ? Buffer.alloc(content, 1) : content);
  }
  const run = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TLC_CONTENT_ROOT: root },
  });
  const generated = join(root, 'src', 'data', 'images.generated.ts');
  const result = { ...run, images: existsSync(generated) ? readFileSync(generated, 'utf8') : '' };
  rmSync(root, { recursive: true, force: true });
  return result;
}

describe('image validation in the content build', () => {
  it('accepts a photo with alt text and writes a literal require for it', () => {
    const entry = { ...baseEntry, image: { file: 'sample-find.jpg', alt: 'Three circles on a wall', credit: 'Nick S.' } };
    const run = build(entry, { 'sample-find.jpg': 2048 });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('1 photos');
    expect(run.images).toContain('"sample-find": require("../../content/images/sample-find.jpg"),');
  });

  it('writes an empty map when no entry has a photo', () => {
    const run = build(baseEntry);
    expect(run.status).toBe(0);
    expect(run.images).toContain('export const images: Record<string, ImageSourcePropType> = {};');
  });

  it('fails when the file is missing, oversized, oddly named, or the alt text is absent', () => {
    const missing = build({ ...baseEntry, image: { file: 'sample-find.jpg', alt: 'Circles' } });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('is not in content/images/');

    const oversized = build(
      { ...baseEntry, image: { file: 'sample-find.jpg', alt: 'Circles' } },
      { 'sample-find.jpg': 300 * 1024 + 1 }
    );
    expect(oversized.status).toBe(1);
    expect(oversized.stderr).toContain('keep photos under 300 KB');

    const badName = build({ ...baseEntry, image: { file: 'Sample Find.gif', alt: 'Circles' } }, { 'Sample Find.gif': 10 });
    expect(badName.status).toBe(1);
    expect(badName.stderr).toContain('lowercase kebab-case');

    const noAlt = build({ ...baseEntry, image: { file: 'sample-find.jpg' } }, { 'sample-find.jpg': 10 });
    expect(noAlt.status).toBe(1);
    expect(noAlt.stderr).toContain('"image.alt" is required');

    const unknownKey = build({ ...baseEntry, image: { file: 'sample-find.jpg', alt: 'Circles', caption: 'x' } }, { 'sample-find.jpg': 10 });
    expect(unknownKey.status).toBe(1);
    expect(unknownKey.stderr).toContain('unknown key "caption" in image');
  });

  it('mentions an unreferenced photo without failing the build', () => {
    const run = build(baseEntry, { 'someday.jpg': 10 });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout).toContain('content/images/someday.jpg is not referenced by any entry yet');
  });
});

describe('getEntryImageSource', () => {
  it('returns nothing for entries without a photo', () => {
    for (const entry of getAllEntries()) {
      if (!entry.image) expect(getEntryImageSource(entry)).toBeUndefined();
    }
  });
});

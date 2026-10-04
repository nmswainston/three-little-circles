import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const formatScript = join(projectRoot, 'scripts', 'format-entries.mjs');
const buildScript = join(projectRoot, 'scripts', 'build-entries.mjs');

// A valid entry with every key where someone typing it in might leave it:
// status after the source fields, the title last in display, viewing scrambled.
const scrambled = {
  id: 'sample-find',
  parkId: 'studios_park',
  landId: 'toy_blocks_area',
  attractionId: 'backyard_coaster',
  display: { parkName: 'Studios Park', landName: 'Toy Blocks Area', attractionName: 'Backyard Coaster', entryTitle: 'Sample Find' },
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the formatter tests.',
  whereToLook: { exactSpot: 'The middle of it', scene: 'A wall' },
  viewing: { distance: 'Close', motion: 'Still', lighting: 'Bright' },
  verification: 'Community',
  coordinates: { longitude: -81.56, latitude: 28.36 },
  sourceId: 'TLC-HS-0001',
  status: 'Unverified',
  createdAtISO: '2026-09-16T00:00:00.000Z',
  updatedAtISO: '2026-09-16T00:00:00.000Z',
};

const canonical = {
  id: 'sample-find',
  parkId: 'studios_park',
  landId: 'toy_blocks_area',
  attractionId: 'backyard_coaster',
  display: { entryTitle: 'Sample Find', parkName: 'Studios Park', landName: 'Toy Blocks Area', attractionName: 'Backyard Coaster' },
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the formatter tests.',
  whereToLook: { scene: 'A wall', exactSpot: 'The middle of it' },
  viewing: { motion: 'Still', lighting: 'Bright', distance: 'Close' },
  verification: 'Community',
  status: 'Unverified',
  coordinates: { latitude: 28.36, longitude: -81.56 },
  sourceId: 'TLC-HS-0001',
  createdAtISO: '2026-09-16T00:00:00.000Z',
  updatedAtISO: '2026-09-16T00:00:00.000Z',
};

const scrambledFact = {
  title: 'A fact',
  id: 'sample-fact',
  body: 'Something true about the park.',
  parkId: 'studios_park',
};

const challenge = {
  id: 'sample-challenge',
  title: 'Sample',
  blurb: 'Two targets.',
  goal: 'all',
  targets: [{ attraction: 'studios_park/toy_blocks_area/backyard_coaster' }],
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

let root: string;
const entryPath = () => join(root, 'content', 'entries', 'sample-find.json');
const factPath = () => join(root, 'content', 'facts', 'sample-fact.json');
const challengePath = () => join(root, 'content', 'challenges', 'sample-challenge.json');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tlc-format-'));
  for (const dir of ['entries', 'facts', 'challenges']) mkdirSync(join(root, 'content', dir), { recursive: true });
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(entryPath(), json(scrambled));
  writeFileSync(factPath(), json(scrambledFact));
  writeFileSync(challengePath(), json(challenge));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(script: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TLC_CONTENT_ROOT: root },
  });
}

describe('format-entries', () => {
  it('puts every key in canonical order, nested objects included, and changes nothing else', () => {
    const result = run(formatScript);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Formatted 2 of 3 content files:');
    expect(result.stdout).toContain('content/entries/sample-find.json');
    expect(result.stdout).toContain('content/facts/sample-fact.json');

    // Byte for byte what the schema says, and the same data as before.
    expect(readFileSync(entryPath(), 'utf8')).toBe(json(canonical));
    expect(JSON.parse(readFileSync(entryPath(), 'utf8'))).toEqual(scrambled);
    expect(Object.keys(JSON.parse(readFileSync(factPath(), 'utf8')))).toEqual(['id', 'parkId', 'title', 'body']);
    expect(readFileSync(challengePath(), 'utf8')).toBe(json(challenge));
  });

  it('is a no-op the second time', () => {
    run(formatScript);
    const again = run(formatScript);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('All 3 content files are in canonical order.');
    expect(readFileSync(entryPath(), 'utf8')).toBe(json(canonical));
  });

  it('lists the files it would change with --check and writes nothing', () => {
    const check = run(formatScript, '--check');
    expect(check.status).toBe(1);
    expect(check.stderr).toContain('2 of 3 content files are out of order:');
    expect(check.stderr).toContain('content/entries/sample-find.json');
    expect(check.stderr).toContain('npm run content:format');
    expect(readFileSync(entryPath(), 'utf8')).toBe(json(scrambled));

    run(formatScript);
    const clean = run(formatScript, '--check');
    expect(clean.status).toBe(0);
    expect(clean.stderr).toBe('');
  });

  it('keeps a key it does not know, after the known ones, for the build to report', () => {
    writeFileSync(entryPath(), json({ ...scrambled, colour: 'red' }));
    expect(run(formatScript).status).toBe(0);
    const keys = Object.keys(JSON.parse(readFileSync(entryPath(), 'utf8')));
    expect(keys[keys.length - 1]).toBe('colour');
    expect(keys.slice(0, -1)).toEqual(Object.keys(canonical));
  });

  it('keeps even a "__proto__" key, which a plain object would swallow', () => {
    // Built as text: an object literal with __proto__ would set the prototype instead.
    writeFileSync(entryPath(), json(scrambled).replace(/\n}\n$/, ',\n  "__proto__": "red"\n}\n'));
    expect(run(formatScript).status).toBe(0);
    const keys = Object.keys(JSON.parse(readFileSync(entryPath(), 'utf8')));
    expect(keys[keys.length - 1]).toBe('__proto__');
    expect(keys.slice(0, -1)).toEqual(Object.keys(canonical));
  });

  it('rejects a file that is not JSON instead of writing over it', () => {
    writeFileSync(factPath(), '{ not json\n');
    const result = run(formatScript);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('content/facts/sample-fact.json: not valid JSON');
    expect(readFileSync(factPath(), 'utf8')).toBe('{ not json\n');
  });
});

describe('build-entries key order', () => {
  it('fails an out-of-order entry and names the key and the fix', () => {
    rmSync(join(root, 'content', 'facts'), { recursive: true });
    rmSync(join(root, 'content', 'challenges'), { recursive: true });
    const result = run(buildScript, '--check');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"status" belongs before "sourceId" in entry');
    expect(result.stderr).toContain('"entryTitle" belongs before "attractionName" in display');
    expect(result.stderr).toContain('npm run content:format');
  });

  it('passes the same entry once formatted', () => {
    rmSync(join(root, 'content', 'facts'), { recursive: true });
    rmSync(join(root, 'content', 'challenges'), { recursive: true });
    expect(run(formatScript).status).toBe(0);
    const result = run(buildScript);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});

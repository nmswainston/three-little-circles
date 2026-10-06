import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const buildScript = join(projectRoot, 'scripts', 'build-entries.mjs');

// Entries in canonical key order, since the build refuses any other.
const find = (id: string, sourceId: string) => ({
  id,
  parkId: 'studios_park',
  landId: 'toy_blocks_area',
  attractionId: 'backyard_coaster',
  display: { entryTitle: `Find ${id}`, parkName: 'Studios Park', landName: 'Toy Blocks Area', attractionName: 'Backyard Coaster' },
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the summary test.',
  whereToLook: { scene: 'A wall', exactSpot: 'The middle of it' },
  verification: 'Community',
  status: 'Unverified',
  sourceId,
  createdAtISO: '2026-09-16T00:00:00.000Z',
  updatedAtISO: '2026-09-16T00:00:00.000Z',
});
const surprise = { ...find('sample-surprise', 'TLC-HS-0003'), entryType: 'FACT' };
const fact = { id: 'sample-fact', parkId: 'studios_park', title: 'A fact', body: 'Something true about the park.' };
const challenge = {
  id: 'sample-challenge',
  title: 'Sample',
  blurb: 'One target.',
  goal: 'all',
  targets: [{ attraction: 'studios_park/toy_blocks_area/backyard_coaster' }],
};
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tlc-summary-'));
  for (const dir of ['entries', 'facts', 'challenges']) mkdirSync(join(root, 'content', dir), { recursive: true });
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  // Facts are checked against the destinations list, so the fixture borrows the real one.
  copyFileSync(join(projectRoot, 'content', 'destinations.json'), join(root, 'content', 'destinations.json'));
  writeFileSync(join(root, 'content', 'entries', 'sample-find.json'), json(find('sample-find', 'TLC-HS-0001')));
  writeFileSync(join(root, 'content', 'entries', 'sample-find-2.json'), json(find('sample-find-2', 'TLC-HS-0002')));
  writeFileSync(join(root, 'content', 'entries', 'sample-surprise.json'), json(surprise));
  writeFileSync(join(root, 'content', 'facts', 'sample-fact.json'), json(fact));
  writeFileSync(join(root, 'content', 'challenges', 'sample-challenge.json'), json(challenge));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(...args: string[]) {
  return spawnSync(process.execPath, [buildScript, ...args], { encoding: 'utf8', env: { ...process.env, TLC_CONTENT_ROOT: root } });
}

describe('build-entries summary', () => {
  it('splits the entries into Hidden Mickeys and other hidden details, ready to paste into the store notes', () => {
    const built = run();
    expect(built.stderr).toBe('');
    expect(built.status).toBe(0);
    expect(built.stdout).toContain(
      'Validated 3 entries (2 Hidden Mickeys and 1 other hidden detail), 1 fact, 1 challenge, and 0 photos and wrote the generated files.'
    );

    const checked = run('--check');
    expect(checked.status).toBe(0);
    expect(checked.stdout).toContain(
      'Validated 3 entries (2 Hidden Mickeys and 1 other hidden detail), 1 fact, 1 challenge, and 0 photos; generated files are up to date.'
    );
  });
});

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '..', 'scripts', 'build-entries.mjs');

const entry = (id: string, landId: string, attractionId: string) => ({
  id,
  parkId: 'studios_park',
  landId,
  attractionId,
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the challenge validation tests.',
  whereToLook: { scene: 'A wall', exactSpot: 'The middle of it' },
});

const ENTRIES = [
  entry('tower-lobby-find', 'sunset_area', 'tower_ride'),
  entry('tower-library-find', 'sunset_area', 'tower_ride'),
  entry('coaster-queue-find', 'toy_area', 'coaster_ride'),
];

const DESTINATIONS = [{ parkId: 'studios_park', name: 'Studios Park', region: 'Florida', parkKey: 'studios' }];

const valid = {
  id: 'tower-guest',
  title: 'Tower Guest',
  blurb: 'Every hidden detail at the tower.',
  parkId: 'studios_park',
  icon: 'business',
  goal: 'all',
  targets: [{ attraction: 'studios_park/sunset_area/tower_ride' }],
};

// Builds a throwaway project root with three entries and the given
// challenges, then runs the content build against it.
function build(challenges: Record<string, unknown>[], fileNames?: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'tlc-challenges-'));
  for (const dir of ['entries', 'challenges']) mkdirSync(join(root, 'content', dir), { recursive: true });
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(join(root, 'content', 'destinations.json'), JSON.stringify(DESTINATIONS));
  for (const e of ENTRIES) writeFileSync(join(root, 'content', 'entries', `${e.id}.json`), JSON.stringify(e));
  challenges.forEach((c, i) => {
    const name = fileNames?.[i] ?? `${c.id}.json`;
    writeFileSync(join(root, 'content', 'challenges', name), JSON.stringify(c));
  });
  const run = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: { ...process.env, TLC_CONTENT_ROOT: root },
  });
  const generated = join(root, 'src', 'data', 'challenges.generated.ts');
  const result = { ...run, generated: existsSync(generated) ? readFileSync(generated, 'utf8') : '' };
  rmSync(root, { recursive: true, force: true });
  return result;
}

describe('challenge validation in the content build', () => {
  it('accepts each goal and writes the challenges out', () => {
    const run = build([
      valid,
      { id: 'studio-sampler', title: 'Studio Sampler', blurb: 'One in each area.', goal: 'each', targets: [{ land: 'studios_park/sunset_area' }, { land: 'studios_park/toy_area' }] },
      { id: 'pick-two', title: 'Pick Two', blurb: 'Any two.', goal: 'any', count: 2, targets: [{ entry: 'tower-lobby-find' }, { entry: 'coaster-queue-find' }, { park: 'studios_park' }] },
    ]);
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('3 challenges');
    expect(run.generated).toContain('"id": "tower-guest"');
    expect(run.generated).toContain('"id": "studio-sampler"');
  });

  it('accepts a list of ids as one target, and checks every id in it', () => {
    const grouped = { land: ['studios_park/sunset_area', 'studios_park/toy_area'] };
    const ok = build([{ ...valid, goal: 'any', count: 1, targets: [grouped] }]);
    expect(ok.stderr).toBe('');
    expect(ok.status).toBe(0);

    const typo = build([{ ...valid, targets: [{ land: ['studios_park/sunset_area', 'studios_park/typo_area'] }] }]);
    expect(typo.status).toBe(1);
    expect(typo.stderr).toContain('targets[0] land "studios_park/typo_area" matches no entries');

    const empty = build([{ ...valid, targets: [{ land: [] }] }]);
    expect(empty.status).toBe(1);
    expect(empty.stderr).toContain('set to an id or a list of ids');
  });

  it('rejects a target that matches no entries', () => {
    const run = build([{ ...valid, targets: [{ attraction: 'studios_park/sunset_area/typo_ride' }] }]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('targets[0] attraction "studios_park/sunset_area/typo_ride" matches no entries');
  });

  it('rejects a malformed or repeated target', () => {
    const run = build([
      {
        ...valid,
        targets: [
          { attraction: 'studios_park/sunset_area/tower_ride', land: 'studios_park/sunset_area' },
          { ride: 'tower' },
          { entry: 'tower-lobby-find' },
          { entry: 'tower-lobby-find' },
        ],
      },
    ]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('targets[0] must have exactly one of');
    expect(run.stderr).toContain('targets[1] must have exactly one of');
    expect(run.stderr).toContain('targets[3] repeats an earlier target');
  });

  it('checks count against the goal', () => {
    const missing = build([{ ...valid, goal: 'any' }]);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('"count" must be a whole number from 1 to 1');

    const tooMany = build([{ ...valid, goal: 'any', count: 2 }]);
    expect(tooMany.stderr).toContain('"count" must be a whole number from 1 to 1');

    const unused = build([{ ...valid, count: 1 }]);
    expect(unused.stderr).toContain('"count" is only used when "goal" is "any"');
  });

  it('rejects an unknown goal, park, icon, or key, and a file name that does not match the id', () => {
    const run = build(
      [{ ...valid, goal: 'most', parkId: 'nowhere_park', icon: 'not-a-real-icon', reward: 'cake' }],
      ['wrong-name.json']
    );
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('"goal" must be one of all, each, any');
    expect(run.stderr).toContain('"parkId" "nowhere_park" is not listed');
    expect(run.stderr).toContain('"icon" "not-a-real-icon" is not an Ionicons glyph name');
    expect(run.stderr).toContain('unknown key "reward" in challenge');
    expect(run.stderr).toContain('file name must match id "tower-guest"');
  });

  it('requires a title, a blurb, and at least one target', () => {
    const run = build([{ id: 'bare', goal: 'all', targets: [] }]);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('missing required string "title"');
    expect(run.stderr).toContain('missing required string "blurb"');
    expect(run.stderr).toContain('"targets" must be a non-empty array');
  });
});

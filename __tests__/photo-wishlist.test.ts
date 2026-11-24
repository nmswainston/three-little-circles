import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const libUrl = pathToFileURL(join(__dirname, '..', 'scripts', 'lib', 'photo-wishlist.mjs')).href;

type Entry = Record<string, unknown>;
type Row = { id: string; rank: number; [key: string]: unknown };
type Wishlist = {
  total: number;
  withPhoto: number;
  ranked: Row[];
  parks: { name: string; lands: { landId: string; attractions: { name: string; entries: Row[] }[] }[] }[];
};

const destinations = [
  { parkId: 'park_a', name: 'Park A', landOrder: ['front', 'back'] },
  { parkId: 'park_b', name: 'Park B', landOrder: ['only'] },
];

function entry(id: string, over: Entry = {}): Entry {
  return {
    id,
    parkId: 'park_a',
    landId: 'front',
    attractionId: 'ride_one',
    entryType: 'HIDDEN_MICKEY',
    locationType: 'Ride',
    difficulty: 'Medium',
    verification: 'Community',
    status: 'Unverified',
    display: { entryTitle: id, parkName: 'Park A', landName: 'Front Land', attractionName: 'Ride One' },
    whereToLook: { scene: `scene of ${id}`, exactSpot: `spot of ${id}` },
    ...over,
  };
}

/** The display block for an entry in another land or attraction of Park A. */
const shown = (id: string, landName: string, attractionName: string) => ({ entryTitle: id, parkName: 'Park A', landName, attractionName });

/**
 * Runs the library in a child process, since Jest's loader does not take a
 * bare .mjs file, and returns whatever the expression evaluates to as JSON.
 * `wishlist` is the built wishlist and `lib` is the module.
 */
function run<T>(entries: Entry[], expression: string): T {
  const code = `
    import * as lib from ${JSON.stringify(libUrl)};
    const entries = ${JSON.stringify(entries)};
    const destinations = ${JSON.stringify(destinations)};
    const wishlist = lib.buildWishlist(entries, destinations);
    process.stdout.write(JSON.stringify(${expression}));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as T;
}

const ranked = (entries: Entry[]) => run<Row[]>(entries, 'wishlist.ranked');
const ids = (rows: Row[]) => rows.map((r) => r.id);

describe('needsPhoto', () => {
  it('skips finds that have a photo or are gone from the park', () => {
    const result = run<boolean[]>(
      [],
      `[lib.needsPhoto(${JSON.stringify(entry('a'))}), lib.needsPhoto(${JSON.stringify(entry('b', { image: { file: 'b.jpg', alt: 'x' } }))}), lib.needsPhoto(${JSON.stringify(entry('c', { status: 'Removed' }))})]`
    );
    expect(result).toEqual([true, false, false]);
  });
});

describe('buildWishlist ranking', () => {
  it('puts verified finds first, whatever their difficulty', () => {
    const rows = ranked([
      entry('hard-community', { difficulty: 'Hard' }),
      entry('easy-verified', { difficulty: 'Easy', verification: 'In-person' }),
      entry('medium-photo', { difficulty: 'Medium', verification: 'Photo' }),
    ]);
    expect(ids(rows)).toEqual(['medium-photo', 'easy-verified', 'hard-community']);
  });

  it('puts official-material finds between verified and community ones', () => {
    const rows = ranked([
      entry('community', { difficulty: 'Hard' }),
      entry('documented', { difficulty: 'Easy', verification: 'Documented' }),
      entry('verified', { difficulty: 'Easy', verification: 'In-person' }),
    ]);
    expect(ids(rows)).toEqual(['verified', 'documented', 'community']);
  });

  it('ranks hardest first within a tier, then falls back to walking order', () => {
    const rows = ranked([
      entry('easy', { difficulty: 'Easy' }),
      entry('medium-back', { difficulty: 'Medium', landId: 'back', display: shown('medium-back', 'Back Land', 'Ride Two') }),
      entry('medium-front', { difficulty: 'Medium' }),
      entry('hard-b', { difficulty: 'Hard', parkId: 'park_b', landId: 'only' }),
      entry('hard-a', { difficulty: 'Hard' }),
    ]);
    expect(ids(rows)).toEqual(['hard-a', 'hard-b', 'medium-front', 'medium-back', 'easy']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('counts photos and leaves finished and removed finds out', () => {
    const list = run<Wishlist>(
      [entry('a'), entry('b', { image: { file: 'b.jpg', alt: 'x' } }), entry('c', { status: 'Removed' })],
      'wishlist'
    );
    expect(list.total).toBe(3);
    expect(list.withPhoto).toBe(1);
    expect(ids(list.ranked)).toEqual(['a']);
  });
});

describe('buildWishlist by park', () => {
  it('groups by park, then land in the listed order, then attraction by name', () => {
    const list = run<Wishlist>(
      [
        entry('back', { landId: 'back', display: shown('back', 'Back Land', 'Zed') }),
        entry('front-zed', { attractionId: 'zed', display: shown('front-zed', 'Front Land', 'Zed') }),
        entry('front-alpha', { attractionId: 'alpha', display: shown('front-alpha', 'Front Land', 'Alpha') }),
        entry('b-find', { parkId: 'park_b', landId: 'only' }),
      ],
      'wishlist'
    );
    expect(list.parks.map((p) => p.name)).toEqual(['Park A', 'Park B']);
    const a = list.parks[0];
    expect(a.lands.map((l) => l.landId)).toEqual(['front', 'back']);
    expect(a.lands[0].attractions.map((x) => x.name)).toEqual(['Alpha', 'Zed']);
  });

  it('orders finds within an attraction by scene, then setting, then title', () => {
    const list = run<Wishlist>(
      [
        entry('late', { sceneOrder: 5 }),
        entry('early', { sceneOrder: 1 }),
        entry('queue-find', { locationType: 'Queue' }),
        entry('ride-find'),
      ],
      'wishlist'
    );
    expect(ids(list.parks[0].lands[0].attractions[0].entries)).toEqual(['early', 'late', 'queue-find', 'ride-find']);
  });
});

describe('renderMarkdown', () => {
  const sample = [
    entry('ready', { verification: 'In-person', viewing: { motion: 'Moving', lighting: 'Dim', crowding: 'High' } }),
    entry('n1', { difficulty: 'Hard' }),
    entry('n2', { difficulty: 'Medium' }),
    entry('n3', { difficulty: 'Easy' }),
    entry('has-photo', { image: { file: 'x.jpg', alt: 'x' } }),
  ];

  it('summarises, lists ready finds first, and caps the next list', () => {
    const md = run<string>(sample, `lib.renderMarkdown(wishlist, { top: 2, generated: '2026-11-17' })`);
    expect(md).toContain('1 of 5 finds have a photo. 4 still need one.');
    expect(md).toContain('Generated 2026-11-17');
    expect(md).toContain('## Ready to shoot (1)');
    expect(md).toContain('## Verify and shoot next (hardest 2)');
    expect(md).toContain('- [ ] **ready** (Medium, Ride)');
    expect(md).toContain('- id: `ready`');
    expect(md).toContain('- Conditions: Moving, Dim, High crowds');
    // The top-2 list holds the two hardest, but the by-park list still has all four.
    const next = md.split('## Verify and shoot next')[1].split('## By park')[0];
    expect(next).toContain('`n1`');
    expect(next).toContain('`n2`');
    expect(next).not.toContain('`n3`');
    expect(md.split('## By park')[1]).toContain('`n3`');
  });

  it('says so when nothing is verified yet', () => {
    const md = run<string>([entry('only')], 'lib.renderMarkdown(wishlist, { top: 5 })');
    expect(md).toContain('Nothing verified is waiting on a photo.');
  });

  it('marks Hidden Surprises and keeps access notes', () => {
    const md = run<string>(
      [entry('s', { entryType: 'FACT', accessNotes: 'Resort guests only.' })],
      'lib.renderMarkdown(wishlist, { top: 5 })'
    );
    expect(md).toContain('Hidden Surprise');
    expect(md).toContain('- Access: Resort guests only.');
  });
});

describe('renderCsv', () => {
  it('writes one row per need in rank order and quotes commas and quotes', () => {
    const csv = run<string>(
      [
        entry('plain', { difficulty: 'Easy' }),
        entry('tricky', { difficulty: 'Hard', whereToLook: { scene: 'A, B', exactSpot: 'The "big" one' } }),
      ],
      'lib.renderCsv(wishlist)'
    );
    const [header, first, second] = csv.trim().split('\n');
    expect(header.startsWith('rank,entry_id,park,land,attraction,title')).toBe(true);
    expect(header.endsWith('photo_taken,notes')).toBe(true);
    expect(first.startsWith('1,tricky,')).toBe(true);
    expect(first).toContain('"A, B"');
    expect(first).toContain('"The ""big"" one"');
    expect(second.startsWith('2,plain,')).toBe(true);
  });
});

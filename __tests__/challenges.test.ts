import { challengeGroups, challengeProgress } from '../src/data/challenges';
import { getAllEntries } from '../src/data/query';
import { Challenge } from '../src/data/types';

const entries = getAllEntries();
const JUNGLE = 'magic_kingdom_park/jungle_outpost_area/jungle_boat_ride';
const MANSION = 'magic_kingdom_park/colonial_square_area/haunted_manor_ride';
const CANADA = 'showcase_park/canada_pavilion';
const MEXICO = 'showcase_park/mexico_pavilion';

const at = (key: string) => entries.filter((e) => `${e.parkId}/${e.landId}/${e.attractionId}` === key);
const inLand = (key: string) => entries.filter((e) => `${e.parkId}/${e.landId}` === key);
const asFound = (list: typeof entries) => Object.fromEntries(list.map((e) => [e.id, 1]));

const challenge = (goal: Challenge['goal'], targets: Challenge['targets'], count?: number): Challenge => ({
  id: 'test',
  title: 'Test',
  blurb: 'A test challenge.',
  goal,
  targets,
  ...(count !== undefined ? { count } : {}),
});

describe('challengeGroups', () => {
  it('resolves each target to its entries and a display name', () => {
    const [jungle, canada] = challengeGroups(challenge('all', [{ attraction: JUNGLE }, { land: CANADA }]));
    expect(jungle).toMatchObject({ key: JUNGLE, name: 'Jungle Cruise', parkId: 'magic_kingdom_park' });
    expect(jungle.entries).toEqual(at(JUNGLE));
    expect(canada).toMatchObject({ name: 'Canada Pavilion', parkId: 'showcase_park' });
  });

  it('names a park target by its destination and a single entry by its title', () => {
    const [park, entry] = challengeGroups(challenge('any', [{ park: 'magic_kingdom_park' }, { entry: entries[0].id }]));
    expect(park.name).toBe('Magic Kingdom');
    expect(entry.name).toBe(entries[0].display?.entryTitle ?? entries[0].id);
    expect(entry.entries).toHaveLength(1);
  });
});

describe('challengeProgress', () => {
  it('"all" counts every find across the targets and points at the one closest to done', () => {
    const c = challenge('all', [{ attraction: JUNGLE }, { attraction: MANSION }]);
    const jungle = at(JUNGLE);
    const total = jungle.length + at(MANSION).length;

    const p = challengeProgress(c, asFound(jungle.slice(0, jungle.length - 1)));
    expect(p).toMatchObject({ current: jungle.length - 1, goal: total, complete: false });
    expect(p.focus).toMatchObject({ key: JUNGLE, name: 'Jungle Cruise' });

    const done = challengeProgress(c, asFound([...jungle, ...at(MANSION)]));
    expect(done).toMatchObject({ current: total, remaining: 0, complete: true });
    expect(done.focus).toBeUndefined();
  });

  it('"all" counts an entry covered by two targets once', () => {
    const c = challenge('all', [{ attraction: JUNGLE }, { entry: at(JUNGLE)[0].id }]);
    expect(challengeProgress(c, {}).goal).toBe(at(JUNGLE).length);
  });

  it('"each" needs one find per target and names the next one', () => {
    const c = challenge('each', [{ land: CANADA }, { land: MEXICO }]);
    const p = challengeProgress(c, asFound(inLand(MEXICO).slice(0, 1)));
    expect(p).toMatchObject({ current: 1, goal: 2, remaining: 1, complete: false });
    expect(p.focus?.name).toBe('Canada Pavilion');
    expect(p.groups.map((g) => g.done)).toEqual([false, true]);

    expect(challengeProgress(c, asFound([inLand(CANADA)[0], inLand(MEXICO)[0]])).complete).toBe(true);
  });

  it('"any" needs a find in `count` targets and caps there', () => {
    const c = challenge('any', [{ land: CANADA }, { land: MEXICO }, { attraction: JUNGLE }], 2);
    expect(challengeProgress(c, asFound([at(JUNGLE)[0]]))).toMatchObject({ current: 1, goal: 2, complete: false });

    const all = challengeProgress(c, asFound([inLand(CANADA)[0], inLand(MEXICO)[0], at(JUNGLE)[0]]));
    expect(all).toMatchObject({ current: 2, goal: 2, complete: true });
    expect(all.focus).toBeUndefined();
  });

  it('ignores found ids that are not real entries', () => {
    const c = challenge('each', [{ land: CANADA }]);
    expect(challengeProgress(c, { 'not-an-entry': 1 }).current).toBe(0);
  });
});

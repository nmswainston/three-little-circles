import {
  AchievementProgress,
  closestToEarning,
  computeProgress,
  computeUnlocked,
  getAchievements,
  parkAchievementId,
  tierLadder,
  visibleBadges,
} from '../src/data/achievements';
import { labelOrFallback } from '../src/data/labels';
import { getAllEntries } from '../src/data/query';

const entries = getAllEntries();
const asFound = (list: typeof entries, at = 1) => Object.fromEntries(list.map((e) => [e.id, at]));

const done = (progress: Record<string, AchievementProgress>) =>
  Object.keys(progress).filter((id) => progress[id].remaining === 0);

describe('computeProgress', () => {
  it('covers every badge in the catalog and starts empty', () => {
    const progress = computeProgress({});
    for (const achievement of getAchievements()) {
      const p = progress[achievement.id];
      expect(p).toBeDefined();
      expect(p.current).toBe(0);
      expect(p.fraction).toBe(0);
      expect(p.remaining).toBe(p.goal);
    }
  });

  it('agrees with computeUnlocked for any found map', () => {
    const maps = [
      {},
      asFound(entries.slice(0, 1)),
      asFound(entries.slice(0, 30)),
      asFound(entries.filter((_, i) => i % 2 === 0)),
      asFound(entries),
    ];
    for (const found of maps) {
      expect(done(computeProgress(found)).sort()).toEqual(computeUnlocked(found).sort());
    }
  });

  it('caps current at the goal', () => {
    const progress = computeProgress(asFound(entries));
    expect(progress.FIRST_FIND).toMatchObject({ current: 1, goal: 1, fraction: 1, remaining: 0 });
    expect(progress.TEN_FINDS).toMatchObject({ current: 10, goal: 10, remaining: 0 });
  });

  it('counts park badges against every entry in the park', () => {
    const parkId = entries[0].parkId;
    const inPark = entries.filter((e) => e.parkId === parkId);
    const p = computeProgress(asFound(inPark.slice(0, 1)))[parkAchievementId(parkId)];
    expect(p).toMatchObject({ current: 1, goal: inPark.length, remaining: inPark.length - 1 });
  });

  it('points Attraction Master at the attraction closest to done, by its display name', () => {
    const groups = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = `${e.parkId}/${e.landId}/${e.attractionId}`;
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    const [key, biggest] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    expect(biggest.length).toBeGreaterThan(2);

    const p = computeProgress(asFound(biggest.slice(1))).ATTRACTION_COMPLETE;
    expect(p).toMatchObject({ current: biggest.length - 1, goal: biggest.length, remaining: 1 });
    expect(p.focus).toEqual({
      key,
      name: labelOrFallback(biggest[0].display?.attractionName, biggest[0].attractionId),
      parkId: biggest[0].parkId,
    });
  });

  it('breaks a tie between empty lands by the fewest finds left', () => {
    const sizes = new Map<string, number>();
    for (const e of entries) sizes.set(`${e.parkId}/${e.landId}`, (sizes.get(`${e.parkId}/${e.landId}`) ?? 0) + 1);
    const smallest = Math.min(...sizes.values());

    const p = computeProgress({}).LAND_COMPLETE;
    expect(p.goal).toBe(smallest);
    expect(sizes.get(p.focus!.key)).toBe(smallest);
  });

  it('measures Hot Streak by the best single day', () => {
    const noon = Date.parse('2026-09-20T12:00:00Z');
    const day = 24 * 60 * 60 * 1000;
    const [a, b, c] = entries;
    const twoOnOneDay = { [a.id]: noon, [b.id]: noon + 60 * 1000, [c.id]: noon + 3 * day };
    expect(computeProgress(twoOnOneDay).HOT_STREAK).toMatchObject({ current: 2, goal: 3, remaining: 1 });
  });
});

describe('closestToEarning', () => {
  // Tier levels have their own rules below; these use single badges.
  const ids = getAchievements().filter((a) => !a.tier).map((a) => a.id);
  const at = (current: number, goal: number): AchievementProgress => ({
    current,
    goal,
    fraction: current / goal,
    remaining: goal - current,
  });

  it('orders by share done, then fewest left, and skips earned badges', () => {
    const [bigHalf, smallHalf, nearlyDone, earned, untouched] = ids;
    const progress = {
      [bigHalf]: at(5, 10),
      [smallHalf]: at(1, 2),
      [nearlyDone]: at(9, 10),
      [earned]: at(1, 1),
      [untouched]: at(0, 4),
    };
    expect(closestToEarning(progress, [earned])).toEqual([nearlyDone, smallHalf, bigHalf, untouched]);
  });

  it('keeps catalog order for a full tie and respects the limit', () => {
    const progress = Object.fromEntries(ids.map((id) => [id, at(1, 3)]));
    expect(closestToEarning(progress, [], 3)).toEqual(ids.slice(0, 3));
  });

  it('works on real progress', () => {
    const found = asFound(entries.slice(0, 12));
    const closest = closestToEarning(computeProgress(found), computeUnlocked(found));
    expect(closest).toHaveLength(6);
    for (const id of closest) expect(computeUnlocked(found)).not.toContain(id);
  });
});

describe('Hunter tiers', () => {
  const ladder = tierLadder('HUNTER');
  const asFoundN = (n: number) => asFound(entries.slice(0, n));

  it('keeps the old milestone ids as the four levels, lowest first', () => {
    expect(ladder.map((a) => a.id)).toEqual(['FIRST_FIND', 'TEN_FINDS', 'TWENTY_FIVE_FINDS', 'FIFTY_FINDS']);
    expect(ladder.map((a) => a.title)).toEqual(['Hunter: Bronze', 'Hunter: Silver', 'Hunter: Gold', 'Hunter: Platinum']);
    expect(ladder.map((a) => a.tier!.threshold)).toEqual([1, 10, 25, 50]);
  });

  it('shows Hunter once: at its first level while nothing is earned, then at its highest earned level', () => {
    const none = visibleBadges([]);
    expect(none.unearned.filter((a) => a.tier)).toEqual([ladder[0]]);
    expect(none.earned).toEqual([]);

    const silver = visibleBadges(computeUnlocked(asFoundN(12)));
    expect(silver.earned.filter((a) => a.tier).map((a) => a.id)).toEqual(['TEN_FINDS']);
    expect(silver.unearned.some((a) => a.tier)).toBe(false);
  });

  it('offers only the next level as the closest badge, and only when asked once a level is earned', () => {
    const found = asFoundN(24);
    const unlocked = computeUnlocked(found);
    const progress = computeProgress(found);
    const all = closestToEarning(progress, unlocked, 50);
    expect(all).toContain('TWENTY_FIVE_FINDS');
    expect(all).not.toContain('FIFTY_FINDS');
    expect(closestToEarning(progress, unlocked, 50, { nextTiers: false })).not.toContain('TWENTY_FIVE_FINDS');
  });

  it('still unlocks each level on its own', () => {
    expect(computeUnlocked(asFoundN(10))).toEqual(expect.arrayContaining(['FIRST_FIND', 'TEN_FINDS']));
    expect(computeUnlocked(asFoundN(9))).not.toContain('TEN_FINDS');
  });
});

describe('secret badges', () => {
  const at = (hour: number, day = 20) => new Date(2026, 8, day, hour, 0).getTime();
  const secretIds = getAchievements()
    .filter((a) => a.secret)
    .map((a) => a.id);

  it('has four secrets, hidden from the lists until earned', () => {
    expect(secretIds.sort()).toEqual(['NIGHT_OWL', 'PARK_HOPPER', 'ROPE_DROP', 'TOPSY_TURVY']);
    const { unearned, hidden } = visibleBadges([]);
    expect(hidden.map((a) => a.id).sort()).toEqual(secretIds);
    expect(unearned.some((a) => a.secret)).toBe(false);

    const revealed = visibleBadges(['TOPSY_TURVY']);
    expect(revealed.earned.map((a) => a.id)).toContain('TOPSY_TURVY');
    expect(revealed.hidden.map((a) => a.id)).not.toContain('TOPSY_TURVY');
  });

  it('never nudges toward a secret, however close it is', () => {
    const upsideDown = entries.find((e) => e.whereToLook?.orientation === 'Upside-down')!;
    const progress = computeProgress({});
    progress.TOPSY_TURVY = { current: 0, goal: 1, fraction: 0.99, remaining: 1 };
    expect(closestToEarning(progress, [], 50)).not.toContain('TOPSY_TURVY');
    expect(computeUnlocked({ [upsideDown.id]: at(12) })).toContain('TOPSY_TURVY');
  });

  it('Park Hopper needs three theme parks on one day, resorts not counted', () => {
    const firstIn = (parkId: string) => entries.find((e) => e.parkId === parkId)!;
    const parks = [...new Set(entries.map((e) => e.parkId))].filter((id) => !id.endsWith('_bucket'));
    const [p1, p2, p3] = parks.map(firstIn);
    expect(computeUnlocked({ [p1.id]: at(10), [p2.id]: at(12), [p3.id]: at(15) })).toContain('PARK_HOPPER');
    expect(computeUnlocked({ [p1.id]: at(10), [p2.id]: at(12), [p3.id]: at(15, 21) })).not.toContain('PARK_HOPPER');
    const resort = firstIn('resorts_bucket');
    expect(computeUnlocked({ [p1.id]: at(10), [p2.id]: at(12), [resort.id]: at(15) })).not.toContain('PARK_HOPPER');
  });

  it('Rope Drop and Night Owl go by the local hour a find was marked', () => {
    const one = entries[0].id;
    expect(computeUnlocked({ [one]: at(8) })).toContain('ROPE_DROP');
    expect(computeUnlocked({ [one]: at(9) })).not.toContain('ROPE_DROP');
    expect(computeUnlocked({ [one]: at(21) })).toContain('NIGHT_OWL');
    expect(computeUnlocked({ [one]: at(2) })).toContain('NIGHT_OWL');
    expect(computeUnlocked({ [one]: at(2) })).not.toContain('ROPE_DROP');
    expect(computeUnlocked({ [one]: at(14) })).not.toEqual(expect.arrayContaining(['NIGHT_OWL']));
  });
});

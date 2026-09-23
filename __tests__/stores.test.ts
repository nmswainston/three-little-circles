import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { computeUnlocked, getAchievements, parkAchievementId } from '../src/data/achievements';
import { getAllEntries } from '../src/data/query';
import { RESORTS_BUCKET_ID } from '../src/data/constants';

const entries = getAllEntries();

beforeAll(async () => {
  // Achievements only recompute once both stores have loaded from storage.
  await useFoundStore.persist.rehydrate();
  await useAchievementsStore.persist.rehydrate();
});

beforeEach(() => {
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
});

describe('useFoundStore', () => {
  it('toggles found on and off with a timestamp', () => {
    const id = entries[0].id;
    expect(useFoundStore.getState().isFound(id)).toBe(false);

    useFoundStore.getState().toggleFound(id);
    expect(useFoundStore.getState().isFound(id)).toBe(true);
    expect(typeof useFoundStore.getState().getFoundAt(id)).toBe('number');

    useFoundStore.getState().toggleFound(id);
    expect(useFoundStore.getState().isFound(id)).toBe(false);
  });

  it('clearAll empties the map', () => {
    useFoundStore.getState().toggleFound(entries[0].id);
    useFoundStore.getState().toggleFound(entries[1].id);
    useFoundStore.getState().clearAll();
    expect(useFoundStore.getState().found).toEqual({});
  });
});

describe('achievement catalog', () => {
  it('has one badge per destination with content, after the milestones', () => {
    const all = getAchievements();
    const parkIds = new Set(entries.map((e) => e.parkId));
    const parkBadges = all.filter((a) => a.parkId);
    expect(parkBadges.map((a) => a.parkId).sort()).toEqual([...parkIds].sort());
    expect(all[0].id).toBe('FIRST_FIND');
    expect(new Set(all.map((a) => a.id)).size).toBe(all.length);
  });
});

describe('computeUnlocked', () => {
  it('unlocks nothing with no finds', () => {
    expect(computeUnlocked({})).toEqual([]);
  });

  it('unlocks FIRST_FIND after one real entry', () => {
    expect(computeUnlocked({ [entries[0].id]: 1 })).toContain('FIRST_FIND');
  });

  it('ignores ids that are not real entries', () => {
    expect(computeUnlocked({ 'not-an-entry': 1 })).toEqual([]);
  });

  it('unlocks ATTRACTION_COMPLETE when every entry at one attraction is found', () => {
    const first = entries[0];
    const sameAttraction = entries.filter(
      (e) =>
        e.parkId === first.parkId &&
        e.landId === first.landId &&
        e.attractionId === first.attractionId
    );
    const found = Object.fromEntries(sameAttraction.map((e) => [e.id, 1]));
    expect(computeUnlocked(found)).toContain('ATTRACTION_COMPLETE');
  });

  it('unlocks a park badge only when that whole park is found', () => {
    const resortEntries = entries.filter((e) => e.parkId === RESORTS_BUCKET_ID);
    const allButOne = Object.fromEntries(resortEntries.slice(1).map((e) => [e.id, 1]));
    expect(computeUnlocked(allButOne)).not.toContain(parkAchievementId(RESORTS_BUCKET_ID));

    const all = Object.fromEntries(resortEntries.map((e) => [e.id, 1]));
    expect(computeUnlocked(all)).toContain(parkAchievementId(RESORTS_BUCKET_ID));
  });

  it('unlocks every milestone and park badge when everything is found', () => {
    const found = Object.fromEntries(entries.map((e) => [e.id, 1]));
    const unlocked = computeUnlocked(found);
    expect(unlocked).toEqual(
      expect.arrayContaining(['FIRST_FIND', 'TEN_FINDS', 'LAND_COMPLETE', 'ATTRACTION_COMPLETE'])
    );
    for (const parkId of new Set(entries.map((e) => e.parkId))) {
      expect(unlocked).toContain(parkAchievementId(parkId));
    }
    // Count tiers depend on how much content exists, so derive them from the catalog.
    expect(unlocked.includes('TWENTY_FIVE_FINDS')).toBe(entries.length >= 25);
    expect(unlocked.includes('FIFTY_FINDS')).toBe(entries.length >= 50);
  });
});

describe('achievements react to found changes', () => {
  it('unlocks with a timestamp, queues a toast, and stays unlocked after un-toggling', () => {
    const id = entries[0].id;
    useFoundStore.getState().toggleFound(id);

    const state = useAchievementsStore.getState();
    expect(state.isUnlocked('FIRST_FIND')).toBe(true);
    expect(typeof state.earnedAt.FIRST_FIND).toBe('number');
    // The first entry is a one-find resort, so its land and attraction
    // complete at the same time. FIRST_FIND is always at the front.
    expect(state.pending[0]).toBe('FIRST_FIND');
    expect(state.pending).toEqual(state.unlocked);

    useFoundStore.getState().toggleFound(id);
    expect(useAchievementsStore.getState().isUnlocked('FIRST_FIND')).toBe(true);
  });

  it('dismissPending drops the front of the queue and markSeen clears the new marker', () => {
    useFoundStore.getState().toggleFound(entries[0].id);
    const queued = useAchievementsStore.getState().pending.length;
    expect(queued).toBeGreaterThan(0);
    useAchievementsStore.getState().dismissPending();
    expect(useAchievementsStore.getState().pending).toHaveLength(queued - 1);
    expect(useAchievementsStore.getState().pending).not.toContain('FIRST_FIND');

    expect(useAchievementsStore.getState().seen).toEqual([]);
    useAchievementsStore.getState().markSeen();
    expect(useAchievementsStore.getState().seen.sort()).toEqual([...useAchievementsStore.getState().unlocked].sort());
  });

  it('a silent check records the unlock without queuing a toast', () => {
    useFoundStore.setState({ found: { [entries[0].id]: 1 } });
    useAchievementsStore.setState({ unlocked: [], earnedAt: {}, seen: [], pending: [] });
    useAchievementsStore.getState().checkAchievements({ silent: true });
    expect(useAchievementsStore.getState().isUnlocked('FIRST_FIND')).toBe(true);
    expect(useAchievementsStore.getState().pending).toEqual([]);
  });
});

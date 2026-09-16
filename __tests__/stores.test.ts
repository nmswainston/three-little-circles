import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore, computeUnlocked } from '../src/store/useAchievementsStore';
import { getAllEntries } from '../src/data/query';
import { RESORTS_BUCKET_ID } from '../src/data/constants';

const entries = getAllEntries();

beforeEach(() => {
  useFoundStore.setState({ found: {} });
  useAchievementsStore.setState({ unlocked: [] });
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

  it('distinguishes resorts from parks for completion badges', () => {
    const resort = entries.find((e) => e.parkId === RESORTS_BUCKET_ID);
    if (!resort) return;
    const sameResort = entries.filter(
      (e) => e.parkId === RESORTS_BUCKET_ID && e.landId === resort.landId
    );
    const found = Object.fromEntries(sameResort.map((e) => [e.id, 1]));
    const unlocked = computeUnlocked(found);
    expect(unlocked).toContain('RESORT_COMPLETE');
    expect(unlocked).not.toContain('PARK_COMPLETE');
    expect(unlocked).not.toContain('LAND_COMPLETE');
  });

  it('unlocks everything when every entry is found', () => {
    const found = Object.fromEntries(entries.map((e) => [e.id, 1]));
    const unlocked = computeUnlocked(found);
    expect(unlocked).toEqual(
      expect.arrayContaining(['FIRST_FIND', 'TEN_FINDS', 'PARK_COMPLETE', 'LAND_COMPLETE', 'ATTRACTION_COMPLETE', 'RESORT_COMPLETE'])
    );
  });
});

describe('achievements react to found changes', () => {
  it('unlocks when an entry is toggled found and stays unlocked after un-toggling', () => {
    const id = entries[0].id;
    useFoundStore.getState().toggleFound(id);
    expect(useAchievementsStore.getState().isUnlocked('FIRST_FIND')).toBe(true);

    useFoundStore.getState().toggleFound(id);
    expect(useAchievementsStore.getState().isUnlocked('FIRST_FIND')).toBe(true);
  });
});

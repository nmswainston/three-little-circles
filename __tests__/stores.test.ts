import { useFoundStore } from '../src/store/useFoundStore';
import { useAchievementsStore } from '../src/store/useAchievementsStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import {
  computeUnlocked,
  countUnreachableAchievements,
  getAchievement,
  getAchievements,
  parkAchievementId,
} from '../src/data/achievements';
import { getDestination } from '../src/data/destinations';
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

describe('useSettingsStore', () => {
  it('starts with Hide found off and remembers the toggle', () => {
    expect(useSettingsStore.getState().hideFound).toBe(false);
    useSettingsStore.getState().setHideFound(true);
    expect(useSettingsStore.getState().hideFound).toBe(true);
    useSettingsStore.getState().setHideFound(false);
    expect(useSettingsStore.getState().hideFound).toBe(false);
  });
});

describe('useSettingsStore hints', () => {
  it('starts with hints one at a time on, and can be turned off', () => {
    expect(useSettingsStore.getState().hintMode).toBe(true);
    useSettingsStore.getState().setHintMode(false);
    expect(useSettingsStore.getState().hintMode).toBe(false);
    useSettingsStore.getState().setHintMode(true);
    expect(useSettingsStore.getState().hintMode).toBe(true);
  });
});

describe('badge catalog reachability', () => {
  it('hides fixed badges the shipped content cannot satisfy, but can still resolve them by id', () => {
    const shown = getAchievements().map((a) => a.id);
    const all = getAchievements({ includeUnreachable: true }).map((a) => a.id);
    expect(all.length).toBe(shown.length + countUnreachableAchievements());
    for (const id of shown) expect(all).toContain(id);

    if (entries.length < 25) {
      expect(shown).not.toContain('TWENTY_FIVE_FINDS');
      expect(getAchievement('TWENTY_FIVE_FINDS')?.title).toBe('Adventurer');
    }
    if (entries.length >= 10) expect(shown).toContain('TEN_FINDS');
  });
});

describe('skill badges', () => {
  const hard = entries.filter((e) => e.difficulty === 'Hard');
  const queue = entries.filter((e) => e.locationType === 'Queue');
  const facts = entries.filter((e) => e.entryType === 'FACT');
  const asFound = (list: typeof entries, at = 1) => Object.fromEntries(list.map((e) => [e.id, at]));

  it('EAGLE_EYE needs five Hard finds', () => {
    if (hard.length < 5) return;
    expect(computeUnlocked(asFound(hard.slice(0, 4)))).not.toContain('EAGLE_EYE');
    expect(computeUnlocked(asFound(hard.slice(0, 5)))).toContain('EAGLE_EYE');
  });

  it('QUEUE_MASTER needs three finds in queues', () => {
    if (queue.length < 3) return;
    expect(computeUnlocked(asFound(queue.slice(0, 2)))).not.toContain('QUEUE_MASTER');
    expect(computeUnlocked(asFound(queue.slice(0, 3)))).toContain('QUEUE_MASTER');
  });

  it('EASTER_EGG needs one Hidden Surprise', () => {
    if (facts.length === 0) return;
    const finds = entries.filter((e) => e.entryType === 'FIND');
    expect(computeUnlocked(asFound(finds))).not.toContain('EASTER_EGG');
    expect(computeUnlocked(asFound(facts.slice(0, 1)))).toContain('EASTER_EGG');
  });

  it('HOT_STREAK needs three finds on the same calendar day', () => {
    const noon = Date.parse('2026-09-20T12:00:00Z');
    const minute = 60 * 1000;
    const day = 24 * 60 * 60 * 1000;
    const three = entries.slice(0, 3);
    const sameDay = { [three[0].id]: noon, [three[1].id]: noon + 5 * minute, [three[2].id]: noon + 10 * minute };
    const spread = { [three[0].id]: noon, [three[1].id]: noon + 2 * day, [three[2].id]: noon + 4 * day };
    expect(computeUnlocked(sameDay)).toContain('HOT_STREAK');
    expect(computeUnlocked(spread)).not.toContain('HOT_STREAK');
  });

  it('COAST_TO_COAST waits for content in a second region', () => {
    const regions = new Set(entries.map((e) => getDestination(e.parkId)?.region ?? 'Florida'));
    const everything = computeUnlocked(asFound(entries));
    if (regions.size < 2) {
      expect(getAchievements().map((a) => a.id)).not.toContain('COAST_TO_COAST');
      expect(everything).not.toContain('COAST_TO_COAST');
    } else {
      expect(everything).toContain('COAST_TO_COAST');
    }
  });
});

describe('useSettingsStore onboarding', () => {
  it('starts not onboarded and remembers when the intro was seen', () => {
    expect(useSettingsStore.getState().onboarded).toBe(false);
    useSettingsStore.getState().setOnboarded(true);
    expect(useSettingsStore.getState().onboarded).toBe(true);
    useSettingsStore.getState().setOnboarded(false);
  });
});

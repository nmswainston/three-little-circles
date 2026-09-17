import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AchievementId, computeUnlocked } from "../data/achievements";
import { useFoundStore } from "./useFoundStore";

export type { Achievement, AchievementId } from "../data/achievements";
export { getAchievements, getAchievement, computeUnlocked } from "../data/achievements";

interface AchievementsState {
  /** Achievements ever earned. Once earned, an achievement stays earned. */
  unlocked: AchievementId[];
  /** When each achievement was earned, ms since epoch. */
  earnedAt: Record<AchievementId, number>;
  /** Earned achievements the user has looked at on the Profile screen. */
  seen: AchievementId[];
  /** Freshly earned achievements waiting for the unlock toast. Not persisted. */
  pending: AchievementId[];

  checkAchievements: (options?: { silent?: boolean }) => void;
  isUnlocked: (id: AchievementId) => boolean;
  /** Mark the given achievements as seen, or every earned one when omitted. */
  markSeen: (ids?: AchievementId[]) => void;
  dismissPending: () => void;
}

export const ACHIEVEMENTS_STORAGE_KEY = "tlc.achievements.v1";

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      earnedAt: {},
      seen: [],
      pending: [],

      checkAchievements: ({ silent = false } = {}) => {
        const earned = computeUnlocked(useFoundStore.getState().found);
        const have = new Set(get().unlocked);
        const fresh = earned.filter((id) => !have.has(id));
        if (fresh.length === 0) return;

        const now = Date.now();
        set((state) => ({
          unlocked: [...state.unlocked, ...fresh],
          earnedAt: { ...state.earnedAt, ...Object.fromEntries(fresh.map((id) => [id, now])) },
          pending: silent ? state.pending : [...state.pending, ...fresh],
        }));
      },

      isUnlocked: (id) => get().unlocked.includes(id),

      markSeen: (ids) =>
        set((state) => ({
          seen: Array.from(new Set([...state.seen, ...(ids ?? state.unlocked)])),
        })),

      dismissPending: () => set((state) => ({ pending: state.pending.slice(1) })),
    }),
    {
      name: ACHIEVEMENTS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: (state) => ({ unlocked: state.unlocked, earnedAt: state.earnedAt, seen: state.seen }),
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<AchievementsState>;
        if (version < 2) {
          // Version 1 stored only the unlocked list. Treat those as already
          // seen so an update never greets the user with a stack of toasts.
          const unlocked = Array.isArray(old.unlocked) ? old.unlocked : [];
          return { unlocked, earnedAt: {}, seen: unlocked };
        }
        return old;
      },
    }
  )
);

// Achievements are recomputed whenever the found map changes, but only once
// both stores have loaded from disk; before that the comparison would be
// against empty state and everything would look freshly earned.
const bothHydrated = () => useFoundStore.persist.hasHydrated() && useAchievementsStore.persist.hasHydrated();

useFoundStore.subscribe((state, prev) => {
  if (state.found !== prev.found && bothHydrated()) {
    useAchievementsStore.getState().checkAchievements();
  }
});

// Anything discovered while loading (for example a badge added in an update
// that the user already qualifies for) gets the "new" marker but no toast.
const onHydrated = () => {
  if (bothHydrated()) useAchievementsStore.getState().checkAchievements({ silent: true });
};
useFoundStore.persist.onFinishHydration(onHydrated);
useAchievementsStore.persist.onFinishHydration(onHydrated);

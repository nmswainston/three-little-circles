import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { entries } from "../data/entries";
import { RESORTS_BUCKET_ID } from "../data/constants";
import { groupProgress, isComplete } from "../utils/progress";
import { useFoundStore } from "./useFoundStore";

export type AchievementId =
  | "FIRST_FIND"
  | "TEN_FINDS"
  | "PARK_COMPLETE"
  | "LAND_COMPLETE"
  | "ATTRACTION_COMPLETE"
  | "RESORT_COMPLETE";

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "FIRST_FIND", title: "First Find", description: "Spot your very first hidden detail." },
  { id: "TEN_FINDS", title: "Explorer", description: "Find 10 hidden details across the parks." },
  { id: "PARK_COMPLETE", title: "Park Completist", description: "Fully complete any single park." },
  { id: "LAND_COMPLETE", title: "Land Specialist", description: "Fully complete any single land." },
  { id: "ATTRACTION_COMPLETE", title: "Attraction Master", description: "Fully complete any single attraction." },
  { id: "RESORT_COMPLETE", title: "Resort Expert", description: "Fully complete any single resort." },
];

/**
 * Pure: which achievements are satisfied by the current found map.
 * Exported so it can be unit tested without the store.
 */
export function computeUnlocked(found: Record<string, number>): AchievementId[] {
  const isFound = (id: string) => id in found;
  const unlocked: AchievementId[] = [];

  const totalFound = entries.filter((e) => isFound(e.id)).length;
  if (totalFound >= 1) unlocked.push("FIRST_FIND");
  if (totalFound >= 10) unlocked.push("TEN_FINDS");

  const anyComplete = (
    getKey: Parameters<typeof groupProgress>[2]
  ) => groupProgress(entries, isFound, getKey).some(isComplete);

  const parks = entries.filter((e) => e.parkId !== RESORTS_BUCKET_ID);
  const resorts = entries.filter((e) => e.parkId === RESORTS_BUCKET_ID);

  if (groupProgress(parks, isFound, (e) => ({ key: e.parkId, name: e.parkId })).some(isComplete)) {
    unlocked.push("PARK_COMPLETE");
  }
  if (groupProgress(parks, isFound, (e) => ({ key: `${e.parkId}/${e.landId}`, name: e.landId })).some(isComplete)) {
    unlocked.push("LAND_COMPLETE");
  }
  if (anyComplete((e) => ({ key: `${e.parkId}/${e.landId}/${e.attractionId}`, name: e.attractionId }))) {
    unlocked.push("ATTRACTION_COMPLETE");
  }
  if (groupProgress(resorts, isFound, (e) => ({ key: `${e.parkId}/${e.landId}`, name: e.landId })).some(isComplete)) {
    unlocked.push("RESORT_COMPLETE");
  }

  return unlocked;
}

interface AchievementsState {
  /** Achievements ever unlocked. Once earned, an achievement stays earned. */
  unlocked: AchievementId[];
  checkAchievements: () => void;
  isUnlocked: (id: AchievementId) => boolean;
}

export const ACHIEVEMENTS_STORAGE_KEY = "tlc.achievements.v1";

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: [],

      checkAchievements: () => {
        const earned = computeUnlocked(useFoundStore.getState().found);
        const current = get().unlocked;
        const merged = Array.from(new Set([...current, ...earned]));
        if (merged.length !== current.length) {
          set({ unlocked: merged });
        }
      },

      isUnlocked: (id) => get().unlocked.includes(id),
    }),
    {
      name: ACHIEVEMENTS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ unlocked: state.unlocked }),
    }
  )
);

// Re-check whenever the found map changes, including after it rehydrates from storage.
useFoundStore.subscribe((state, prev) => {
  if (state.found !== prev.found) {
    useAchievementsStore.getState().checkAchievements();
  }
});

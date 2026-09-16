import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FoundState {
  /** entryId -> timestamp (ms since epoch) when it was marked found */
  found: Record<string, number>;
  toggleFound: (entryId: string) => void;
  isFound: (entryId: string) => boolean;
  getFoundAt: (entryId: string) => number | undefined;
  clearAll: () => void;
}

export const FOUND_STORAGE_KEY = "tlc.found.v1";

export const useFoundStore = create<FoundState>()(
  persist(
    (set, get) => ({
      found: {},

      toggleFound: (entryId) => {
        set((state) => {
          const next = { ...state.found };
          if (next[entryId]) {
            delete next[entryId];
          } else {
            next[entryId] = Date.now();
          }
          return { found: next };
        });
      },

      isFound: (entryId) => entryId in get().found,

      getFoundAt: (entryId) => get().found[entryId],

      clearAll: () => set({ found: {} }),
    }),
    {
      name: FOUND_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ found: state.found }),
    }
  )
);

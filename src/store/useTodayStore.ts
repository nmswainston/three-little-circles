import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TodayState {
  /** The finds the guest plans to look for, in the order they were added. */
  ids: string[];
  has: (entryId: string) => boolean;
  toggle: (entryId: string) => void;
  remove: (entryIds: string[]) => void;
  clear: () => void;
}

export const TODAY_STORAGE_KEY = 'tlc.today.v1';

/**
 * Today's list: the finds a guest has picked to look for on this visit. It
 * stays on the device and is left out of backups. It is a plan, not progress,
 * so restoring it onto another phone later would only bring back stale picks.
 */
export const useTodayStore = create<TodayState>()(
  persist(
    (set, get) => ({
      ids: [],
      has: (entryId) => get().ids.includes(entryId),
      toggle: (entryId) =>
        set((state) => ({
          ids: state.ids.includes(entryId) ? state.ids.filter((id) => id !== entryId) : [...state.ids, entryId],
        })),
      remove: (entryIds) =>
        set((state) => {
          const drop = new Set(entryIds);
          const ids = state.ids.filter((id) => !drop.has(id));
          return ids.length === state.ids.length ? state : { ids };
        }),
      clear: () => set((state) => (state.ids.length === 0 ? state : { ids: [] })),
    }),
    {
      name: TODAY_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ ids: state.ids }),
    }
  )
);

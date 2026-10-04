import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RecentState {
  /** The find this guest opened most recently, so the Parks home can offer to pick up there. */
  lastEntryId?: string;
  setLastEntry: (entryId: string) => void;
}

export const RECENT_STORAGE_KEY = 'tlc.recent.v1';

/**
 * Where the guest left off. This is where they were looking, not progress, so
 * it stays on the device and is left out of backups.
 */
export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      lastEntryId: undefined,
      setLastEntry: (entryId) => set((state) => (state.lastEntryId === entryId ? state : { lastEntryId: entryId })),
    }),
    {
      name: RECENT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lastEntryId: state.lastEntryId }),
    }
  )
);

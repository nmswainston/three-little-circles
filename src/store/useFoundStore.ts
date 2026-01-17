import { create } from 'zustand';

interface FoundState {
  found: Record<string, number>; // locationId -> timestamp
  toggleFound: (locationId: string) => void;
  isFound: (locationId: string) => boolean;
  clearAll: () => void;
  getFoundAt: (locationId: string) => number | undefined;
}

export const useFoundStore = create<FoundState>((set, get) => ({
  found: {},
  
  toggleFound: (locationId: string) => {
    set((state) => {
      const newFound = { ...state.found };
      if (newFound[locationId]) {
        delete newFound[locationId];
      } else {
        newFound[locationId] = Date.now();
      }
      return { found: newFound };
    });
    // Check achievements after toggling (lazy import to avoid circular dependency)
    const { useAchievementsStore } = require('./useAchievementsStore');
    useAchievementsStore.getState().checkAchievements();
  },
  
  isFound: (locationId: string) => {
    return locationId in get().found;
  },
  
  getFoundAt: (locationId: string) => {
    return get().found[locationId];
  },
  
  clearAll: () => {
    set({ found: {} });
    // Check achievements after clearing (lazy import to avoid circular dependency)
    const { useAchievementsStore } = require('./useAchievementsStore');
    useAchievementsStore.getState().checkAchievements();
  },
}));

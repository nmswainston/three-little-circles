import { create } from 'zustand';
import { useFoundStore } from './useFoundStore';
import { useLocationsStore } from './useLocationsStore';
import { groupProgress } from '../utils/progress';

export type AchievementId =
  | 'FIRST_FIND'
  | 'TEN_FINDS'
  | 'PARK_COMPLETE'
  | 'LAND_COMPLETE'
  | 'ATTRACTION_COMPLETE'
  | 'RESORT_COMPLETE';

interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'FIRST_FIND',
    title: 'First Find',
    description: 'Spot your very first hidden detail.',
  },
  {
    id: 'TEN_FINDS',
    title: 'Explorer',
    description: 'Find 10 hidden details across the parks.',
  },
  {
    id: 'PARK_COMPLETE',
    title: 'Park Completist',
    description: 'Fully complete any single park.',
  },
  {
    id: 'LAND_COMPLETE',
    title: 'Land Specialist',
    description: 'Fully complete any single land.',
  },
  {
    id: 'ATTRACTION_COMPLETE',
    title: 'Attraction Master',
    description: 'Fully complete any single attraction.',
  },
  {
    id: 'RESORT_COMPLETE',
    title: 'Resort Expert',
    description: 'Fully complete any single resort.',
  },
];

interface AchievementsState {
  unlocked: Set<AchievementId>;
  checkAchievements: () => void;
  isUnlocked: (id: AchievementId) => boolean;
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  unlocked: new Set<AchievementId>(),

  checkAchievements: () => {
    const locations = useLocationsStore.getState().locations;
    const found = useFoundStore.getState().found;
    const isFound = (id: string) => id in found;

    const totalFound = Object.keys(found).length;
    const newlyUnlocked = new Set<AchievementId>();

    // FIRST_FIND
    if (totalFound >= 1) {
      newlyUnlocked.add('FIRST_FIND');
    }

    // TEN_FINDS
    if (totalFound >= 10) {
      newlyUnlocked.add('TEN_FINDS');
    }

    // PARK_COMPLETE
    const parksProgress = groupProgress(locations, isFound, (l) => l.parkId);
    for (const [_, stats] of parksProgress) {
      if (stats.total > 0 && stats.found === stats.total) {
        newlyUnlocked.add('PARK_COMPLETE');
        break;
      }
    }

    // LAND_COMPLETE
    const landsProgress = groupProgress(locations, isFound, (l) => l.landId);
    for (const [_, stats] of landsProgress) {
      if (stats.total > 0 && stats.found === stats.total) {
        newlyUnlocked.add('LAND_COMPLETE');
        break;
      }
    }

    // ATTRACTION_COMPLETE
    const attractionsProgress = groupProgress(
      locations,
      isFound,
      (l) => l.attractionId
    );
    for (const [_, stats] of attractionsProgress) {
      if (stats.total > 0 && stats.found === stats.total) {
        newlyUnlocked.add('ATTRACTION_COMPLETE');
        break;
      }
    }

    // RESORT_COMPLETE
    const resortsProgress = groupProgress(locations, isFound, (l) => l.resortId);
    for (const [_, stats] of resortsProgress) {
      if (stats.total > 0 && stats.found === stats.total) {
        newlyUnlocked.add('RESORT_COMPLETE');
        break;
      }
    }

    set((state) => ({
      unlocked: new Set([...state.unlocked, ...newlyUnlocked]),
    }));
  },

  isUnlocked: (id: AchievementId) => {
    return get().unlocked.has(id);
  },
}));

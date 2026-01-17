import { create } from 'zustand';
import { Location } from '../types/models';
import { locations as sampleLocations } from '../data/sampleData';

interface LocationsState {
  locations: Location[];
  setLocations: (locations: Location[]) => void;
}

export const useLocationsStore = create<LocationsState>((set) => ({
  locations: sampleLocations,
  setLocations: (locations) => set({ locations }),
}));

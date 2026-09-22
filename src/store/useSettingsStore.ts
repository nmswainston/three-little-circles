import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type Appearance = 'system' | 'day' | 'night';
export type MapType = 'standard' | 'hybrid';

interface SettingsState {
  /** Which color theme to use. "system" follows the device setting. */
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  /** Map tiles: drawn map, or satellite imagery with labels. */
  mapType: MapType;
  setMapType: (mapType: MapType) => void;
  /**
   * Hunting mode: park screens leave out entries already marked found, so
   * the list is only what's left to spot. Remembered across parks and launches.
   */
  hideFound: boolean;
  setHideFound: (hideFound: boolean) => void;
  /**
   * Random id generated once per install. Sent with sightings so the server
   * can rate-limit them. Not a hardware identifier and not tied to a person.
   */
  deviceId: string;
}

export const SETTINGS_STORAGE_KEY = 'tlc.settings.v1';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'system',
      setAppearance: (appearance) => set({ appearance }),
      mapType: 'standard',
      setMapType: (mapType) => set({ mapType }),
      hideFound: false,
      setHideFound: (hideFound) => set({ hideFound }),
      deviceId: Crypto.randomUUID(),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        appearance: state.appearance,
        mapType: state.mapType,
        hideFound: state.hideFound,
        deviceId: state.deviceId,
      }),
    }
  )
);

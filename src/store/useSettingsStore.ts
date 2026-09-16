import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Appearance = 'system' | 'day' | 'night';

interface SettingsState {
  /** Which color theme to use. "system" follows the device setting. */
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
}

export const SETTINGS_STORAGE_KEY = 'tlc.settings.v1';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: 'system',
      setAppearance: (appearance) => set({ appearance }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ appearance: state.appearance }),
    }
  )
);

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UnlockState {
  /**
   * True once the one-time unlock was bought or restored. Kept on the device
   * so locked parks open offline, in a ride queue with no signal.
   */
  unlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
}

export const UNLOCK_STORAGE_KEY = 'tlc.unlock.v1';

export const useUnlockStore = create<UnlockState>()(
  persist(
    (set) => ({
      unlocked: false,
      setUnlocked: (unlocked) => set({ unlocked }),
    }),
    {
      name: UNLOCK_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ unlocked: state.unlocked }),
    }
  )
);

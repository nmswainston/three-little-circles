import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfirmationStatus } from '../lib/confirm';

export type MyReport = { status: ConfirmationStatus; at: number };

interface ConfirmationsState {
  /** entryId -> the latest "Still there?" report sent from this device. */
  reported: Record<string, MyReport>;
  record: (entryId: string, status: ConfirmationStatus) => void;
}

export const CONFIRMATIONS_STORAGE_KEY = 'tlc.confirmations.v1';

export const useConfirmationsStore = create<ConfirmationsState>()(
  persist(
    (set) => ({
      reported: {},
      record: (entryId, status) =>
        set((state) => ({ reported: { ...state.reported, [entryId]: { status, at: Date.now() } } })),
    }),
    {
      name: CONFIRMATIONS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ reported: state.reported }),
    }
  )
);

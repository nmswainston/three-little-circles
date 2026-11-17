import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, LocationType } from '../data/types';

/** The text a guest has typed into the suggestion form. A photo is not kept: its file may not outlive the app. */
export interface SightingDraft {
  parkId?: string;
  attraction: string;
  land: string;
  title: string;
  whereToLook: string;
  difficulty: Difficulty;
  locationType: LocationType;
  note: string;
  contactName: string;
  creditOk: boolean;
  savedAt: number;
}

interface DraftState {
  /** One draft for a new find, plus one per find a photo is being sent for. */
  drafts: Record<string, SightingDraft>;
  saveDraft: (key: string, draft: Omit<SightingDraft, 'savedAt'>) => void;
  clearDraft: (key: string) => void;
}

export const DRAFT_STORAGE_KEY = 'tlc.drafts.v1';
export const NEW_FIND_DRAFT = 'new';
/** A draft this old is more likely forgotten than wanted. */
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const photoDraftKey = (entryId: string) => `photo:${entryId}`;

/** True when the guest has typed something worth keeping. Chip choices alone are not. */
export function draftHasContent(draft: Omit<SightingDraft, 'savedAt'>): boolean {
  return [draft.attraction, draft.land, draft.title, draft.whereToLook, draft.note, draft.contactName].some(
    (value) => value.trim().length > 0
  );
}

/** The saved draft for a key, or nothing when it is missing or too old to trust. */
export function readDraft(key: string, now: number = Date.now()): SightingDraft | undefined {
  const draft = useDraftStore.getState().drafts[key];
  if (!draft || now - draft.savedAt > DRAFT_MAX_AGE_MS) return undefined;
  return draft;
}

/**
 * Unsent suggestions, so a dropped signal or a closed app in the middle of a
 * park does not cost the guest what they typed. It lives on the device only
 * and is left out of backups: it is work in progress, not progress.
 */
export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (key, draft) =>
        set((state) => ({ drafts: { ...state.drafts, [key]: { ...draft, savedAt: Date.now() } } })),
      clearDraft: (key) =>
        set((state) => {
          if (!(key in state.drafts)) return state;
          const { [key]: _removed, ...rest } = state.drafts;
          return { drafts: rest };
        }),
    }),
    {
      name: DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ drafts: state.drafts }),
    }
  )
);

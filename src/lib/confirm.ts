import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, isSupabaseConfigured, ensureAnonymousSession } from './supabase';

/**
 * Sending a "Still there?" report. The app signs in anonymously first, then
 * inserts a row; the server fills in the voter id from the session and the
 * policy in supabase/schema.sql refuses any row that claims another id.
 */
export type ConfirmationStatus = 'seen' | 'missing';

export type ConfirmResult = { ok: true } | { ok: false; message: string };

const NETWORK_MESSAGE = "Couldn't send your report. Check your connection and try again.";

export async function sendConfirmation(entryId: string, status: ConfirmationStatus): Promise<ConfirmResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Reports aren't set up in this build yet." };
  }
  const session = await ensureAnonymousSession();
  if (!session.ok) return session;

  try {
    const { error } = await supabase.from('confirmations').insert({
      entry_id: entryId,
      status,
      app_version: Constants.expoConfig?.version ?? null,
      platform: Platform.OS,
    });
    if (error) {
      // P0001 is the rate-limit trigger; its message is written for people.
      if (error.code === 'P0001') return { ok: false, message: error.message };
      return { ok: false, message: NETWORK_MESSAGE };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}

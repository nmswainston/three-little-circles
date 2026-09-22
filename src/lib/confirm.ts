import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Sending a "Still there?" report. The app only ever inserts a row; the
 * policies in supabase/schema.sql refuse anything else from the anon key.
 */
export type ConfirmationStatus = 'seen' | 'missing';

export type ConfirmResult = { ok: true } | { ok: false; message: string };

const NETWORK_MESSAGE = "Couldn't send your report. Check your connection and try again.";

export async function sendConfirmation(
  entryId: string,
  status: ConfirmationStatus,
  deviceId: string
): Promise<ConfirmResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Reports aren't set up in this build yet." };
  }
  try {
    const { error } = await supabase.from('confirmations').insert({
      entry_id: entryId,
      status,
      device_id: deviceId,
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

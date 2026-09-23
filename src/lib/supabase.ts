import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined;

/** True when SUPABASE_URL and SUPABASE_ANON_KEY were present at build time. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Supabase client. Only the anon key ever ships in the app; what it can do is
 * limited by the row-level security policies in supabase/schema.sql. For
 * "Still there?" reports the app first signs in anonymously, and the session
 * is kept on the device so one install is one voter.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// The token refresh timer should only run while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    'Supabase is not configured; sightings cannot be submitted. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to enable it.'
  );
}

export type SessionResult = { ok: true } | { ok: false; message: string };

/**
 * Makes sure this install has an anonymous Supabase user. Its id is what
 * "Still there?" rows are tied to on the server, so a client cannot vote as
 * someone else or as many devices. Nothing about the person is collected.
 * Needs Anonymous sign-ins turned on in the project (see supabase/README.md).
 */
export async function ensureAnonymousSession(): Promise<SessionResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "Reports aren't set up in this build yet." };
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return { ok: true };
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      return {
        ok: false,
        message: /anonymous/i.test(error.message)
          ? "Reports aren't enabled for this project yet."
          : "Couldn't connect. Check your connection and try again.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't connect. Check your connection and try again." };
  }
}

export { supabaseUrl, supabaseAnonKey };

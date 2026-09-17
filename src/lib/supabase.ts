import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined;

/** True when SUPABASE_URL and SUPABASE_ANON_KEY were present at build time. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Anonymous Supabase client. Only the anon key ever ships in the app; what it
 * can do is limited by the row-level security policies in supabase/schema.sql
 * (insert a pending submission, upload a submission photo, nothing else).
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    'Supabase is not configured; sightings cannot be submitted. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY in .env to enable it.'
  );
}

export { supabaseUrl, supabaseAnonKey };

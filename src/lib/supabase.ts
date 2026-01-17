import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL as string | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string | undefined;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  if (__DEV__) {
    console.warn(
      'Supabase is not configured. App will run without Supabase. ' +
      'To enable Supabase, set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
    );
  }
  // Create a dummy client that won't break if accidentally used
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };

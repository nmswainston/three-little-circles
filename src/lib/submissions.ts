import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { supabase, isSupabaseConfigured } from './supabase';
import { Difficulty, LocationType } from '../data/types';

/**
 * Sending a suggested find to the review queue.
 *
 * The app only ever inserts a pending row and uploads a photo; the policies in
 * supabase/schema.sql refuse anything else from the anon key.
 */
export type SightingInput = {
  parkId: string;
  parkName: string;
  region?: string;
  landName?: string;
  attractionName: string;
  title: string;
  whereToLook: string;
  difficulty: Difficulty;
  locationType: LocationType;
  photo?: { uri: string; mimeType?: string };
  contactName?: string;
  creditOk: boolean;
};

export type SubmitResult = { ok: true } | { ok: false; message: string };

export const LIMITS = {
  title: { min: 3, max: 80 },
  whereToLook: { min: 20, max: 2000 },
  attraction: { min: 2, max: 80 },
  land: { max: 80 },
  contact: { max: 60 },
} as const;

const BUCKET = 'submission-photos';
const NETWORK_MESSAGE = "Couldn't send your suggestion. Check your connection and try again.";

/** Returns human-readable problems, empty when the input is acceptable. */
export function validateSighting(input: SightingInput): string[] {
  const problems: string[] = [];
  const title = input.title.trim();
  const where = input.whereToLook.trim();
  const attraction = input.attractionName.trim();
  const land = (input.landName ?? '').trim();
  const contact = (input.contactName ?? '').trim();

  if (!input.parkId) problems.push('Pick the park or resort.');
  if (attraction.length < LIMITS.attraction.min) problems.push('Add the attraction, shop, or spot.');
  if (attraction.length > LIMITS.attraction.max) problems.push(`Keep the attraction name under ${LIMITS.attraction.max} characters.`);
  if (land.length > LIMITS.land.max) problems.push(`Keep the land name under ${LIMITS.land.max} characters.`);
  if (title.length < LIMITS.title.min) problems.push('Give the find a short title.');
  if (title.length > LIMITS.title.max) problems.push(`Keep the title under ${LIMITS.title.max} characters.`);
  if (where.length < LIMITS.whereToLook.min) problems.push('Tell us a little more about where to look.');
  if (where.length > LIMITS.whereToLook.max) problems.push(`Keep where-to-look under ${LIMITS.whereToLook.max} characters.`);
  if (input.creditOk && contact.length === 0) problems.push('Add the name to credit, or turn credit off.');
  if (contact.length > LIMITS.contact.max) problems.push(`Keep the name under ${LIMITS.contact.max} characters.`);

  return problems;
}

function contentTypeFor(uri: string, mimeType?: string): string {
  if (mimeType && mimeType.startsWith('image/')) return mimeType;
  const lower = uri.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

async function readPhoto(uri: string, mimeType?: string): Promise<{ body: ArrayBuffer | Blob; contentType: string; ext: string }> {
  const contentType = contentTypeFor(uri, mimeType);
  const ext = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return { body: await response.blob(), contentType, ext };
  }
  const body = await new File(uri).arrayBuffer();
  return { body, contentType, ext };
}

export async function submitSighting(input: SightingInput, deviceId: string): Promise<SubmitResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Suggestions aren't set up in this build yet." };
  }
  const problems = validateSighting(input);
  if (problems.length > 0) return { ok: false, message: problems[0] };

  try {
    let photoPath: string | null = null;
    if (input.photo) {
      const { body, contentType, ext } = await readPhoto(input.photo.uri, input.photo.mimeType);
      photoPath = `${deviceId}/${Crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(photoPath, body, { contentType, upsert: false });
      if (error) {
        return { ok: false, message: "The photo didn't upload. Try a different photo, or send without one." };
      }
    }

    const contact = (input.contactName ?? '').trim();
    const { error } = await supabase.from('submissions').insert({
      park_id: input.parkId,
      park_name: input.parkName,
      region: input.region ?? null,
      land_name: (input.landName ?? '').trim() || null,
      attraction_name: input.attractionName.trim(),
      title: input.title.trim(),
      where_to_look: input.whereToLook.trim(),
      difficulty: input.difficulty,
      location_type: input.locationType,
      photo_path: photoPath,
      contact_name: input.creditOk && contact ? contact : null,
      credit_ok: input.creditOk && contact.length > 0,
      device_id: deviceId,
      app_version: Constants.expoConfig?.version ?? null,
      platform: Platform.OS,
      status: 'pending',
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

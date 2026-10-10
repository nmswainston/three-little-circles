import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { supabase, isSupabaseConfigured } from './supabase';
import { Difficulty, HiddenMickeyEntry, LocationType } from '../data/types';
import { getDestination } from '../data/destinations';
import { labelOrFallback } from '../data/labels';

/**
 * Sending a suggested find, or a photo of one already in the guide, to the
 * review queue.
 *
 * The app only ever inserts a pending row and uploads a photo; the policies in
 * supabase/schema.sql refuse anything else from the anon key.
 */
export type SightingPhoto = { uri: string; mimeType?: string };

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
  photo?: SightingPhoto;
  contactName?: string;
  creditOk: boolean;
  /** A photo of a find already in the guide: that entry's id. The photo is then required. */
  forEntryId?: string;
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

/** Stands in for the note when a photo arrives without one, since the queue wants a where-to-look. */
export const PHOTO_ONLY_NOTE = 'Photo only. The sender left no note.';
/** Carries a note too short for the queue's minimum, so "Look up" still gets through. */
const SHORT_NOTE_PREFIX = 'Photo. Note from the sender: ';

function photoNote(note: string | undefined): string {
  const trimmed = (note ?? '').trim();
  if (trimmed.length === 0) return PHOTO_ONLY_NOTE;
  const text = trimmed.length >= LIMITS.whereToLook.min ? trimmed : `${SHORT_NOTE_PREFIX}${trimmed}`;
  return text.slice(0, LIMITS.whereToLook.max);
}

/**
 * The input for a photo of a find already in the guide. The entry supplies
 * everything the queue needs to file it; the sender adds the photo, an
 * optional note, and an optional credit.
 */
export function photoSightingInput(
  entry: HiddenMickeyEntry,
  fields: { note?: string; photo?: SightingPhoto; contactName?: string; creditOk: boolean }
): SightingInput {
  const destination = getDestination(entry.parkId);
  return {
    parkId: entry.parkId,
    parkName: labelOrFallback(entry.display?.parkName, destination?.name ?? entry.parkId),
    region: destination?.region,
    landName: entry.display?.landName,
    attractionName: labelOrFallback(entry.display?.attractionName, entry.attractionId).slice(0, LIMITS.attraction.max),
    title: labelOrFallback(entry.display?.entryTitle, entry.id).slice(0, LIMITS.title.max),
    whereToLook: photoNote(fields.note),
    difficulty: entry.difficulty,
    locationType: entry.locationType,
    photo: fields.photo,
    contactName: fields.contactName,
    creditOk: fields.creditOk,
    forEntryId: entry.id,
  };
}

/** Returns human-readable problems, empty when the input is acceptable. */
export function validateSighting(input: SightingInput): string[] {
  const problems: string[] = [];
  if (input.forEntryId && !input.photo) problems.push('Add a photo of the find.');
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

type ErrorLike = { code?: string; message?: string; status?: number; statusCode?: string | number } | null | undefined;

function errorText(error: ErrorLike): string {
  return `${error?.code ?? ''} ${error?.status ?? ''} ${error?.statusCode ?? ''} ${error?.message ?? ''}`;
}

/** Why the storage upload was refused, in words the sender can act on. */
export function uploadFailureMessage(error: ErrorLike, photoOnly: boolean): string {
  const text = errorText(error);
  if (/\b413\b|maximum allowed size|too large|payload/i.test(text)) return 'That photo is too large to send. Try a smaller one.';
  if (/\b40[13]\b|row-level security|not allowed|unauthorized|bucket not found/i.test(text)) {
    return 'Photo uploads are not enabled for this project yet.';
  }
  return photoOnly ? "The photo didn't upload. Try a different photo." : "The photo didn't upload. Try a different photo, or send without one.";
}

/** Why the row was refused. The schema cases are the owner's to fix, so they say so instead of blaming the connection. */
export function insertFailureMessage(error: ErrorLike, photoOnly: boolean): string {
  const text = errorText(error);
  const what = photoOnly ? 'photo' : 'suggestion';
  // P0001 is the rate-limit trigger; its message is written for people.
  if (error?.code === 'P0001' && error.message) return error.message;
  // PGRST204 / 42703: a column this build sends that the project's table lacks.
  if (/PGRST204|\b42703\b|column .* does not exist|schema cache/i.test(text)) {
    return photoOnly
      ? 'This project cannot take photos of existing finds yet. Its database needs the latest schema.'
      : 'This project cannot take suggestions yet. Its database needs the latest schema.';
  }
  if (/\b42501\b|row-level security/i.test(text)) return `This project does not accept ${what}s yet.`;
  const code = error?.code ? ` (${error.code})` : '';
  return `Couldn't send your ${what}. Check your connection and try again.${code}`;
}

/** Why the whole attempt threw. A failed read of the photo is not a connection problem. */
export function thrownFailureMessage(error: unknown, photoOnly: boolean): string {
  const what = photoOnly ? 'photo' : 'suggestion';
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/network|timed? ?out|connection|fetch/i.test(message)) {
    return `Couldn't send your ${what}. Check your connection and try again.`;
  }
  if (photoOnly || /file|uri|read|image/i.test(message)) return "Couldn't read that photo. Pick it again and retry.";
  return `Couldn't send your ${what}. Check your connection and try again.`;
}

export async function submitSighting(input: SightingInput, deviceId: string): Promise<SubmitResult> {
  const photoOnly = Boolean(input.forEntryId);
  if (!isSupabaseConfigured) {
    return { ok: false, message: photoOnly ? "Photos aren't set up in this build yet." : "Suggestions aren't set up in this build yet." };
  }
  const problems = validateSighting(input);
  if (problems.length > 0) return { ok: false, message: problems[0] };

  try {
    let photoPath: string | null = null;
    if (input.photo) {
      const { body, contentType, ext } = await readPhoto(input.photo.uri, input.photo.mimeType);
      photoPath = `${deviceId}/${Crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(photoPath, body, { contentType, upsert: false });
      if (error) return { ok: false, message: uploadFailureMessage(error, photoOnly) };
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
      for_entry_id: input.forEntryId ?? null,
      contact_name: input.creditOk && contact ? contact : null,
      credit_ok: input.creditOk && contact.length > 0,
      device_id: deviceId,
      app_version: Constants.expoConfig?.version ?? null,
      platform: Platform.OS,
      status: 'pending',
    });

    if (error) return { ok: false, message: insertFailureMessage(error, photoOnly) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: thrownFailureMessage(error, photoOnly) };
  }
}

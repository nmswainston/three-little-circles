import { getAllEntries } from '../src/data/query';
import {
  photoSightingInput,
  validateSighting,
  submitSighting,
  insertFailureMessage,
  thrownFailureMessage,
  uploadFailureMessage,
  PHOTO_ONLY_NOTE,
  SightingInput,
} from '../src/lib/submissions';

// The client is replaced wholesale: these tests are about what the app sends,
// not about Supabase. The mocks are reached lazily so the factory can run
// before they are initialised.
const mockUpload = jest.fn(async (..._args: unknown[]) => ({ error: null as null | { message: string } }));
const mockInsert = jest.fn(async (..._args: unknown[]) => ({ error: null as null | { code?: string; message: string } }));
jest.mock('../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    storage: { from: () => ({ upload: (...args: unknown[]) => mockUpload(...args) }) },
    from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }),
  },
}));
jest.mock('expo-file-system', () => ({
  File: class {
    async arrayBuffer() {
      return new ArrayBuffer(4);
    }
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'photo-uuid' }));

const entry = getAllEntries().find((e) => e.display?.entryTitle && e.display?.attractionName && e.display?.parkName)!;
const photo = { uri: 'file:///photo.jpg', mimeType: 'image/jpeg' };
const newFind: SightingInput = {
  parkId: entry.parkId,
  parkName: 'Magic Kingdom',
  attractionName: 'Backyard Coaster',
  title: 'Queue Cloud Mickey',
  whereToLook: 'Painted on the cloud mural just past the second switchback.',
  difficulty: 'Medium',
  locationType: 'Queue',
  creditOk: false,
};

describe('photoSightingInput', () => {
  it('files the photo under the entry and uses the stock note when the sender left none', () => {
    const input = photoSightingInput(entry, { note: '  ', photo, creditOk: false });
    expect(input.forEntryId).toBe(entry.id);
    expect(input.parkId).toBe(entry.parkId);
    expect(input.parkName).toBe(entry.display!.parkName);
    expect(input.title).toBe(entry.display!.entryTitle);
    expect(input.attractionName).toBe(entry.display!.attractionName);
    expect(input.difficulty).toBe(entry.difficulty);
    expect(input.locationType).toBe(entry.locationType);
    expect(input.whereToLook).toBe(PHOTO_ONLY_NOTE);
    expect(validateSighting(input)).toEqual([]);
  });

  it('keeps the sender note when there is one', () => {
    const input = photoSightingInput(entry, { note: ' Look up and left of the door. ', photo, creditOk: false });
    expect(input.whereToLook).toBe('Look up and left of the door.');
  });

  it('carries a note too short for the queue minimum instead of refusing it', () => {
    const input = photoSightingInput(entry, { note: 'Look up', photo, creditOk: false });
    expect(input.whereToLook).toBe('Photo. Note from the sender: Look up');
    expect(validateSighting(input)).toEqual([]);
  });

  it('asks for the photo before anything else', () => {
    const input = photoSightingInput(entry, { creditOk: false });
    expect(validateSighting(input)[0]).toBe('Add a photo of the find.');
  });
});

describe('failure messages', () => {
  it('names a photo that is too large', () => {
    expect(uploadFailureMessage({ statusCode: '413', message: 'The object exceeded the maximum allowed size' }, true)).toBe(
      'That photo is too large to send. Try a smaller one.'
    );
  });

  it('names a bucket that refuses uploads', () => {
    expect(uploadFailureMessage({ statusCode: '403', message: 'new row violates row-level security policy' }, true)).toBe(
      'Photo uploads are not enabled for this project yet.'
    );
  });

  it('keeps the plain upload message for anything else', () => {
    expect(uploadFailureMessage({ message: 'nope' }, false)).toBe("The photo didn't upload. Try a different photo, or send without one.");
  });

  it('points at the schema when the table lacks a column this build sends', () => {
    expect(insertFailureMessage({ code: 'PGRST204', message: "Could not find the 'for_entry_id' column of 'submissions' in the schema cache" }, true)).toBe(
      'This project cannot take photos of existing finds yet. Its database needs the latest schema.'
    );
    expect(insertFailureMessage({ code: '42703', message: 'column "for_entry_id" does not exist' }, false)).toBe(
      'This project cannot take suggestions yet. Its database needs the latest schema.'
    );
  });

  it('passes the rate-limit message through and tags unknown codes', () => {
    expect(insertFailureMessage({ code: 'P0001', message: 'Too many submissions from this device. Please try again in an hour.' }, true)).toBe(
      'Too many submissions from this device. Please try again in an hour.'
    );
    expect(insertFailureMessage({ code: 'PGRST301', message: 'JWT expired' }, true)).toBe("Couldn't send your photo. Check your connection and try again. (PGRST301)");
    expect(insertFailureMessage({ message: 'odd' }, false)).toBe("Couldn't send your suggestion. Check your connection and try again.");
  });

  it('tells a failed photo read apart from a dropped connection', () => {
    expect(thrownFailureMessage(new TypeError('Network request failed'), true)).toBe("Couldn't send your photo. Check your connection and try again.");
    expect(thrownFailureMessage(new Error('Unable to read file'), true)).toBe("Couldn't read that photo. Pick it again and retry.");
    expect(thrownFailureMessage(new Error('something odd'), false)).toBe("Couldn't send your suggestion. Check your connection and try again.");
  });
});

describe('submitSighting', () => {
  beforeEach(() => {
    mockUpload.mockClear();
    mockInsert.mockClear();
  });

  it('uploads the photo and files the row against the entry', async () => {
    const input = photoSightingInput(entry, { note: 'Look up and left of the door.', photo, contactName: 'Nick', creditOk: true });
    const result = await submitSighting(input, 'device-12345678');
    expect(result).toEqual({ ok: true });
    expect(mockUpload).toHaveBeenCalledWith('device-12345678/photo-uuid.jpg', expect.anything(), { contentType: 'image/jpeg', upsert: false });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        for_entry_id: entry.id,
        photo_path: 'device-12345678/photo-uuid.jpg',
        title: entry.display!.entryTitle,
        where_to_look: 'Look up and left of the door.',
        contact_name: 'Nick',
        credit_ok: true,
        status: 'pending',
      })
    );
  });

  it('leaves for_entry_id empty on a new find', async () => {
    const result = await submitSighting(newFind, 'device-12345678');
    expect(result).toEqual({ ok: true });
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ for_entry_id: null, photo_path: null }));
  });

  it('names the photo, not a suggestion, when the upload fails', async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: 'nope' } });
    const result = await submitSighting(photoSightingInput(entry, { photo, creditOk: false }), 'device-12345678');
    expect(result).toEqual({ ok: false, message: "The photo didn't upload. Try a different photo." });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('says the database is behind instead of blaming the connection', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: 'PGRST204', message: "Could not find the 'for_entry_id' column" } });
    const result = await submitSighting(photoSightingInput(entry, { photo, creditOk: false }), 'device-12345678');
    expect(result).toEqual({ ok: false, message: 'This project cannot take photos of existing finds yet. Its database needs the latest schema.' });
  });
});

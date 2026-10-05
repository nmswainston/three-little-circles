import { getAllEntries } from '../src/data/query';
import { photoSightingInput, validateSighting, submitSighting, PHOTO_ONLY_NOTE, SightingInput } from '../src/lib/submissions';

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
});

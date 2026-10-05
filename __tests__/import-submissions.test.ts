import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// The library is an ES module, which Jest does not transform here, so each
// call runs it in a child Node process and reads the result back as JSON.
const lib = pathToFileURL(join(__dirname, '..', 'scripts', 'lib', 'submissions-import.mjs')).href;
function call<T>(fn: string, ...args: unknown[]): T {
  const code = `import * as lib from ${JSON.stringify(lib)};\nconsole.log(JSON.stringify(lib[${JSON.stringify(fn)}](...${JSON.stringify(args)})));`;
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout.trim()) as T;
}

const photoRow = {
  id: '0f3c2a9e-1111-2222-3333-444444444444',
  for_entry_id: 'pirates-exit-bells-mickey',
  photo_path: 'device-1/abc.HEIC',
  contact_name: 'Nick "Mouse" S.',
  credit_ok: true,
};

describe('import-submissions library', () => {
  it('tells a photo of an existing find from a new find', () => {
    expect(call('isPhotoSubmission', photoRow)).toBe(true);
    expect(call('isPhotoSubmission', { ...photoRow, for_entry_id: '  ' })).toBe(false);
    expect(call('isPhotoSubmission', { id: 'x', title: 'Queue Cloud Mickey' })).toBe(false);
  });

  it('names the saved photo after its entry and keeps a sane extension', () => {
    expect(call('photoFileName', photoRow)).toBe('pirates-exit-bells-mickey-0f3c2a9e.heic');
    expect(call('photoFileName', { ...photoRow, photo_path: 'device-1/noext' })).toBe('pirates-exit-bells-mickey-0f3c2a9e.jpg');
    expect(call('photoFileName', { ...photoRow, photo_path: 'device-1/x.tar.gz.exe.bin?token=1' })).toBe('pirates-exit-bells-mickey-0f3c2a9e.bin');
  });

  it('prints a content:photo command with a TODO alt and a quoted credit', () => {
    expect(call('photoCommand', photoRow, 'content/inbox/photos/p.heic')).toBe(
      'npm run content:photo -- pirates-exit-bells-mickey content/inbox/photos/p.heic --alt "TODO what the photo shows" --credit "Nick \\"Mouse\\" S."'
    );
    expect(call('photoCommand', { ...photoRow, credit_ok: false }, 'p.jpg')).not.toContain('--credit');
    expect(call('photoCommand', { ...photoRow, contact_name: null }, 'p.jpg')).not.toContain('--credit');
  });

  it('still turns a new find into the same draft as before', () => {
    const row = {
      id: 'row-1',
      created_at: '2026-10-01T00:00:00.000Z',
      park_id: 'magic_kingdom',
      park_name: 'Magic Kingdom',
      region: 'Florida',
      land_name: 'Fantasyland',
      attraction_name: 'Backyard Coaster',
      title: 'Queue Cloud Mickey',
      where_to_look: 'Painted on the cloud mural just past the second switchback.',
      difficulty: 'Medium',
      location_type: 'Queue',
      photo_path: null,
      contact_name: 'Nick',
      credit_ok: true,
      platform: 'ios',
      app_version: '1.0.0',
    };
    const draft = call<Record<string, unknown>>('draftFor', row, 'backyard-coaster-queue-cloud-mickey', '2026-10-05T00:00:00.000Z');
    expect(draft).toEqual(
      expect.objectContaining({
        id: 'backyard-coaster-queue-cloud-mickey',
        parkId: 'magic_kingdom',
        landId: 'TODO-fantasyland',
        attractionId: 'backyard-coaster',
        entryType: 'FIND',
        confidence: 'Interpretive',
        verification: 'Community',
        createdAtISO: '2026-10-05T00:00:00.000Z',
      })
    );
    expect(draft._submission).toEqual(expect.objectContaining({ id: 'row-1', credit: 'Nick' }));
  });
});

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getEntryImageSource } from '../src/data/images';
import { getAllEntries } from '../src/data/query';

const script = join(__dirname, '..', 'scripts', 'build-entries.mjs');

// Genuine 1x1 images, so the build's structural checks see the real thing.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIAAEAAQMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/APS6/hQ/r0//2Q==',
  'base64'
);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWP438HwHwAGmAKHj8UQawAAAABJRU5ErkJggg==',
  'base64'
);
const WEBP = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');

const baseEntry = {
  id: 'sample-find',
  parkId: 'studios_park',
  landId: 'toy_blocks_area',
  attractionId: 'backyard_coaster',
  display: { entryTitle: 'Sample Find', parkName: 'Studios Park', landName: 'Toy Blocks Area', attractionName: 'Backyard Coaster' },
  entryType: 'FIND',
  locationType: 'Queue',
  difficulty: 'Medium',
  description: 'A sample entry used only by the image validation tests.',
  whereToLook: { scene: 'A wall', exactSpot: 'The middle of it' },
};

function withImage(file: string, image: Record<string, unknown> = {}) {
  return { ...baseEntry, image: { file, alt: 'Three circles on a wall', ...image } };
}

// Builds a throwaway project root with one entry and whatever images the test
// wants, then runs the content build against it.
function build(entry: Record<string, unknown>, images: Record<string, Buffer> = {}, args: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'tlc-images-'));
  mkdirSync(join(root, 'content', 'entries'), { recursive: true });
  mkdirSync(join(root, 'content', 'images'), { recursive: true });
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  writeFileSync(join(root, 'content', 'entries', `${entry.id}.json`), JSON.stringify(entry));
  for (const [name, content] of Object.entries(images)) {
    writeFileSync(join(root, 'content', 'images', name), content);
  }
  const run = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, TLC_CONTENT_ROOT: root },
  });
  const generated = join(root, 'src', 'data', 'images.generated.ts');
  const result = { ...run, images: existsSync(generated) ? readFileSync(generated, 'utf8') : '' };
  rmSync(root, { recursive: true, force: true });
  return result;
}

describe('image validation in the content build', () => {
  it('accepts a photo with alt text and writes a literal require for it', () => {
    const run = build(withImage('sample-find.jpg', { credit: 'Nick S.' }), { 'sample-find.jpg': JPEG });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('1 photos');
    expect(run.images).toContain('"sample-find": require("../../content/images/sample-find.jpg"),');
  });

  it('accepts PNG and WebP photos too', () => {
    const png = build(withImage('sample-find.png'), { 'sample-find.png': PNG });
    expect(png.stderr).toBe('');
    expect(png.status).toBe(0);
    expect(png.images).toContain('require("../../content/images/sample-find.png")');

    const webp = build(withImage('sample-find.webp'), { 'sample-find.webp': WEBP });
    expect(webp.stderr).toBe('');
    expect(webp.status).toBe(0);
    expect(webp.images).toContain('require("../../content/images/sample-find.webp")');
  });

  it('writes an empty map when no entry has a photo', () => {
    const run = build(baseEntry);
    expect(run.status).toBe(0);
    expect(run.images).toContain('export const images: Record<string, ImageSourcePropType> = {};');
  });

  it('fails when the file is missing, oversized, oddly named, or the alt text is absent', () => {
    const missing = build(withImage('sample-find.jpg'));
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('is not in content/images/');

    const oversized = build(withImage('sample-find.jpg'), { 'sample-find.jpg': Buffer.alloc(300 * 1024 + 1, 1) });
    expect(oversized.status).toBe(1);
    expect(oversized.stderr).toContain('keep photos under 300 KB');

    const badName = build(withImage('Sample Find.gif'), { 'Sample Find.gif': JPEG });
    expect(badName.status).toBe(1);
    expect(badName.stderr).toContain('lowercase kebab-case');

    const noAlt = build({ ...baseEntry, image: { file: 'sample-find.jpg' } }, { 'sample-find.jpg': JPEG });
    expect(noAlt.status).toBe(1);
    expect(noAlt.stderr).toContain('"image.alt" is required');

    const unknownKey = build(withImage('sample-find.jpg', { caption: 'x' }), { 'sample-find.jpg': JPEG });
    expect(unknownKey.status).toBe(1);
    expect(unknownKey.stderr).toContain('unknown key "caption" in image');
  });

  it('rejects a photo that is cut off, corrupt, or saved under the wrong extension', () => {
    const cutJpeg = build(withImage('sample-find.jpg'), { 'sample-find.jpg': JPEG.subarray(0, JPEG.length - 2) });
    expect(cutJpeg.status).toBe(1);
    expect(cutJpeg.stderr).toContain('missing the JPEG end-of-image marker; the file may be truncated');

    const cutPng = build(withImage('sample-find.png'), { 'sample-find.png': PNG.subarray(0, PNG.length - 12) });
    expect(cutPng.status).toBe(1);
    expect(cutPng.stderr).toContain('missing its PNG IEND chunk; the file may be truncated');

    const cutWebp = build(withImage('sample-find.webp'), { 'sample-find.webp': WEBP.subarray(0, WEBP.length - 4) });
    expect(cutWebp.status).toBe(1);
    expect(cutWebp.stderr).toContain('WebP header declares 42; the file may be truncated');

    const corruptPng = Buffer.from(PNG);
    corruptPng[corruptPng.indexOf('IDAT') + 4] ^= 0xff;
    const corrupt = build(withImage('sample-find.png'), { 'sample-find.png': corruptPng });
    expect(corrupt.status).toBe(1);
    expect(corrupt.stderr).toContain('corrupt PNG IDAT chunk');

    const mislabeled = build(withImage('sample-find.jpg'), { 'sample-find.jpg': PNG });
    expect(mislabeled.status).toBe(1);
    expect(mislabeled.stderr).toContain('does not start with a JPEG header');

    const junk = build(withImage('sample-find.webp'), { 'sample-find.webp': Buffer.alloc(2048, 1) });
    expect(junk.status).toBe(1);
    expect(junk.stderr).toContain('does not start with a WebP header');
  });

  it('mentions an unreferenced photo without failing the build', () => {
    const run = build(baseEntry, { 'someday.jpg': JPEG });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout).toContain('content/images/someday.jpg is not referenced by any entry yet');
  });
});

describe('getEntryImageSource', () => {
  it('returns nothing for entries without a photo', () => {
    for (const entry of getAllEntries()) {
      if (!entry.image) expect(getEntryImageSource(entry)).toBeUndefined();
    }
  });
});

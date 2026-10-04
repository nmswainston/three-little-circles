#!/usr/bin/env node
/**
 * Prepares a reference photo for an entry and wires it in.
 *
 * Usage:
 *   npm run content:photo -- <entry-id> <photo> --alt "What the photo shows" [--credit "Name"] [--replace] [--dry-run]
 *
 * Takes a photo straight off a phone and does what content/images/README.md
 * asks for: bakes the EXIF orientation into the pixels, resizes to at most
 * 1200 px on the long side, re-encodes as a JPEG small enough for the 300 KB
 * limit, drops every scrap of metadata (a phone photo carries GPS and device
 * details that have no business in the bundle), writes it to
 * content/images/<entry-id>.jpg, fills the entry's "image" field, and runs the
 * content build so the generated files are current.
 *
 * TLC_CONTENT_ROOT points at another project root, as in build-entries.mjs.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = process.env.TLC_CONTENT_ROOT || join(here, "..");
const entriesDir = join(root, "content", "entries");
const imagesDir = join(root, "content", "images");
const buildScript = join(here, "build-entries.mjs");

/** Same limit as build-entries.mjs. */
const MAX_BYTES = 300 * 1024;
const MAX_SIDE = 1200;
/** Shrinking stops here: below this the detail itself starts to go, so ask for a tighter crop instead. */
const MIN_SIDE = 600;
const QUALITIES = [82, 76, 70, 64, 58, 52];
/** Keys that come after "image" in an entry, so a new image lands in the usual place. */
const TRAILING_KEYS = ["sourceId", "sourceUrl", "createdAtISO", "updatedAtISO"];

const USAGE =
  'Usage: npm run content:photo -- <entry-id> <photo> --alt "What the photo shows" [--credit "Name"] [--replace] [--dry-run]';

function die(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const opts = { alt: undefined, credit: undefined, replace: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--alt" || arg === "--credit") {
      const value = argv[++i];
      if (value === undefined) die(`${arg} needs a value.\n${USAGE}`);
      opts[arg.slice(2)] = value;
    } else if (arg.startsWith("--alt=")) {
      opts.alt = arg.slice("--alt=".length);
    } else if (arg.startsWith("--credit=")) {
      opts.credit = arg.slice("--credit=".length);
    } else if (arg === "--replace") {
      opts.replace = true;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg.startsWith("--")) {
      die(`Unknown option ${arg}.\n${USAGE}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) die(USAGE);
  return { entryId: positional[0], photoPath: positional[1], ...opts };
}

/** ISO base media file with an HEIF brand: what an iPhone writes by default. */
function isHeif(buffer) {
  if (buffer.length < 12 || buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12);
  return ["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand);
}

/**
 * Re-encodes the photo until it fits: first by stepping the JPEG quality down,
 * then, if that is not enough, by shrinking the long side and trying again.
 * A photo that is already small is tried at its own size; the floor only
 * stops the shrinking. Returns undefined when nothing fits.
 */
async function encode(input) {
  const meta = await sharp(input, { failOn: "error" }).metadata();
  const swapped = (meta.orientation ?? 1) >= 5;
  const width = swapped ? meta.height : meta.width;
  const height = swapped ? meta.width : meta.height;
  const source = { width, height };

  let side = Math.min(MAX_SIDE, Math.max(width, height));
  for (;;) {
    for (const quality of QUALITIES) {
      // rotate() with no argument applies the EXIF orientation to the pixels.
      // With no withMetadata(), the output carries no EXIF, GPS, or maker
      // notes, only the JPEG itself.
      const buffer = await sharp(input, { failOn: "error" })
        .rotate()
        .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (buffer.length <= MAX_BYTES) {
        const out = await sharp(buffer).metadata();
        return { buffer, quality, width: out.width, height: out.height, source };
      }
    }
    const smaller = Math.round(side * 0.85);
    if (smaller < MIN_SIDE) return undefined;
    side = smaller;
  }
}

/** The entry with "image" set, in place if it had one, else before the trailing keys. */
function withImage(entry, image) {
  if ("image" in entry) return { ...entry, image };
  const out = {};
  let inserted = false;
  for (const [key, value] of Object.entries(entry)) {
    if (!inserted && TRAILING_KEYS.includes(key)) {
      out.image = image;
      inserted = true;
    }
    out[key] = value;
  }
  if (!inserted) out.image = image;
  return out;
}

function otherEntryUses(fileName, exceptFile) {
  return readdirSync(entriesDir)
    .filter((f) => f.endsWith(".json") && f !== exceptFile)
    .some((f) => {
      try {
        return JSON.parse(readFileSync(join(entriesDir, f), "utf8")).image?.file === fileName;
      } catch {
        return false;
      }
    });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const entryFile = join(entriesDir, `${args.entryId}.json`);
  if (!existsSync(entryFile)) die(`No entry with id "${args.entryId}" (looked for ${entryFile}).`);
  const entry = JSON.parse(readFileSync(entryFile, "utf8"));

  if (entry.image && !args.replace) {
    die(`${args.entryId} already has a photo (${entry.image.file}). Pass --replace to swap it.`);
  }
  const alt = (args.alt ?? entry.image?.alt ?? "").trim();
  if (!alt) die(`--alt is required: say what the photo shows, for screen readers.\n${USAGE}`);
  const credit = (args.credit ?? entry.image?.credit ?? "").trim() || undefined;

  const photoPath = resolve(args.photoPath);
  if (!existsSync(photoPath)) die(`No file at ${photoPath}.`);
  const input = readFileSync(photoPath);

  let result;
  try {
    result = await encode(input);
  } catch (error) {
    if (isHeif(input)) {
      die(
        `${basename(photoPath)} is an HEIC photo and this machine cannot decode it. ` +
          "Export it as a JPEG first: on an iPhone, share it with AirDrop or Mail, or set " +
          "Settings > Camera > Formats to Most Compatible before shooting."
      );
    }
    die(`Couldn't read ${basename(photoPath)} as an image: ${error.message}`);
  }
  if (!result) {
    die(
      `Couldn't get the photo under ${MAX_BYTES / 1024} KB without shrinking it below ${MIN_SIDE} px on the long side. ` +
        "Crop it to the detail itself and try again."
    );
  }

  const fileName = `${args.entryId}.jpg`;
  const kb = Math.round(result.buffer.length / 1024);
  console.log(
    `${basename(photoPath)}: ${result.source.width}x${result.source.height} -> ${result.width}x${result.height}, ` +
      `JPEG quality ${result.quality}, ${kb} KB, metadata stripped.`
  );
  console.log(`  -> content/images/${fileName}`);
  console.log(`  -> content/entries/${args.entryId}.json image: ${JSON.stringify({ file: fileName, alt, ...(credit ? { credit } : {}) })}`);

  if (args.dryRun) {
    console.log("Dry run: nothing written.");
    return;
  }

  mkdirSync(imagesDir, { recursive: true });
  writeFileSync(join(imagesDir, fileName), result.buffer);

  // A replaced photo under a different name would otherwise sit in the folder
  // unused, and the build rejects orphans.
  const previous = entry.image?.file;
  if (previous && previous !== fileName && existsSync(join(imagesDir, previous)) && !otherEntryUses(previous, basename(entryFile))) {
    unlinkSync(join(imagesDir, previous));
    console.log(`  removed the old photo content/images/${previous}`);
  }

  const updated = withImage(entry, { file: fileName, alt, ...(credit ? { credit } : {}) });
  updated.updatedAtISO = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  writeFileSync(entryFile, `${JSON.stringify(updated, null, 2)}\n`);

  const build = spawnSync(process.execPath, [buildScript], { stdio: "inherit", env: process.env });
  if (build.status !== 0) {
    die("The content build failed; see above. The photo and the entry were written, so fix the message and run npm run content:build.");
  }
  console.log(`Done. Commit content/images/${fileName}, content/entries/${args.entryId}.json, and src/data/images.generated.ts.`);
}

main().catch((error) => die(error instanceof Error ? error.message : String(error)));

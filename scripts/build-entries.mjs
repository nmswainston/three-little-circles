#!/usr/bin/env node
/**
 * Builds src/data/entries.generated.ts from content/entries/*.json,
 * src/data/facts.generated.ts from content/facts/*.json, and
 * src/data/images.generated.ts from the entries' "image" fields and the
 * files in content/images/.
 *
 * Every entry lives in its own JSON file so new Hidden Mickeys can be added
 * without touching app code. This script validates each file against the
 * HiddenMickeyEntry schema, checks cross-entry consistency, and emits a typed
 * TypeScript module the app imports. Park facts (history and trivia about a
 * destination rather than a find inside it) go through the same pipeline
 * with their own, smaller schema.
 *
 * Usage:
 *   node scripts/build-entries.mjs          # validate and write the generated files
 *   node scripts/build-entries.mjs --check  # validate and fail if a generated file is stale
 *
 * TLC_CONTENT_ROOT points the script at another project root (content/ in,
 * src/data/ out). The tests use it to run the validator against fixtures.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.TLC_CONTENT_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content", "entries");
const factsDir = join(root, "content", "facts");
const destinationsFile = join(root, "content", "destinations.json");
const outFile = join(root, "src", "data", "entries.generated.ts");
const factsOutFile = join(root, "src", "data", "facts.generated.ts");
const imagesDir = join(root, "content", "images");
const imagesOutFile = join(root, "src", "data", "images.generated.ts");
const checkOnly = process.argv.includes("--check");

const ENUMS = {
  entryType: ["FIND", "FACT"],
  locationType: ["Queue", "Ride", "Pre-show", "Outdoor", "Indoor"],
  difficulty: ["Easy", "Medium", "Hard"],
  orientation: ["Upright", "Upside-down", "Sideways"],
  confidence: ["Obvious", "Strong", "Interpretive"],
  verification: ["In-person", "Photo", "Community", "Unknown"],
  areaContext: [
    "Entrance", "Queue", "Loading", "Ride", "Dock", "Post-show",
    "Exit", "Lobby", "Walkway", "Outdoor Display", "Shop",
  ],
};

const TOP_LEVEL_KEYS = new Set([
  "id", "parkId", "landId", "attractionId", "display", "entryType",
  "locationType", "difficulty", "areaContext", "description", "whereToLook",
  "bestTip", "funFacts", "viewing", "confidence", "verification",
  "coordinates", "image", "createdAtISO", "updatedAtISO",
]);
const DISPLAY_KEYS = new Set(["parkName", "landName", "attractionName", "entryTitle"]);
const VIEWING_KEYS = new Set(["motion", "lighting", "angle", "crowding", "distance", "notes"]);
const IMAGE_KEYS = new Set(["file", "alt", "credit"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const IMAGE_FILE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z]+$/;
// Every photo ships inside the app, so keep each one small. About 1200 px on
// the long side as a JPEG lands well under this.
const IMAGE_MAX_BYTES = 300 * 1024;
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function checkEnum(file, field, value, allowed, optional = true) {
  if (value === undefined) {
    if (!optional) fail(file, `missing required field "${field}"`);
    return;
  }
  if (!allowed.includes(value)) {
    fail(file, `"${field}" must be one of ${allowed.join(", ")} (got "${value}")`);
  }
}

function checkOptionalString(file, field, value) {
  if (value !== undefined && !isNonEmptyString(value)) {
    fail(file, `"${field}" must be a non-empty string when present`);
  }
}

function checkKeys(file, label, obj, allowed) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) fail(file, `unknown key "${key}" in ${label}`);
  }
}

function validateEntry(file, e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) {
    fail(file, "must be a JSON object");
    return;
  }
  checkKeys(file, "entry", e, TOP_LEVEL_KEYS);

  for (const field of ["id", "parkId", "landId", "attractionId", "description"]) {
    if (!isNonEmptyString(e[field])) fail(file, `missing required string "${field}"`);
  }
  if (isNonEmptyString(e.id)) {
    if (!ID_PATTERN.test(e.id)) fail(file, `id "${e.id}" must be lowercase kebab-case`);
    if (basename(file, ".json") !== e.id) fail(file, `file name must match id "${e.id}"`);
  }

  checkEnum(file, "entryType", e.entryType, ENUMS.entryType, false);
  checkEnum(file, "locationType", e.locationType, ENUMS.locationType, false);
  checkEnum(file, "difficulty", e.difficulty, ENUMS.difficulty, false);
  checkEnum(file, "areaContext", e.areaContext, ENUMS.areaContext);
  checkEnum(file, "confidence", e.confidence, ENUMS.confidence);
  checkEnum(file, "verification", e.verification, ENUMS.verification);

  if (typeof e.whereToLook !== "object" || e.whereToLook === null) {
    fail(file, `missing required object "whereToLook"`);
  } else {
    checkKeys(file, "whereToLook", e.whereToLook, new Set(["scene", "exactSpot", "orientation"]));
    if (!isNonEmptyString(e.whereToLook.scene)) fail(file, `"whereToLook.scene" is required`);
    if (!isNonEmptyString(e.whereToLook.exactSpot)) fail(file, `"whereToLook.exactSpot" is required`);
    checkEnum(file, "whereToLook.orientation", e.whereToLook.orientation, ENUMS.orientation);
  }

  if (e.display !== undefined) {
    if (typeof e.display !== "object" || e.display === null) {
      fail(file, `"display" must be an object`);
    } else {
      checkKeys(file, "display", e.display, DISPLAY_KEYS);
      for (const key of DISPLAY_KEYS) checkOptionalString(file, `display.${key}`, e.display[key]);
    }
  }

  checkOptionalString(file, "bestTip", e.bestTip);
  if (e.funFacts !== undefined) {
    if (!Array.isArray(e.funFacts) || !e.funFacts.every(isNonEmptyString)) {
      fail(file, `"funFacts" must be an array of non-empty strings`);
    }
  }

  if (e.viewing !== undefined) {
    if (typeof e.viewing !== "object" || e.viewing === null) {
      fail(file, `"viewing" must be an object`);
    } else {
      checkKeys(file, "viewing", e.viewing, VIEWING_KEYS);
      for (const key of VIEWING_KEYS) checkOptionalString(file, `viewing.${key}`, e.viewing[key]);
    }
  }

  if (e.coordinates !== undefined) {
    const c = e.coordinates;
    if (typeof c !== "object" || c === null) {
      fail(file, `"coordinates" must be an object`);
    } else {
      checkKeys(file, "coordinates", c, new Set(["latitude", "longitude"]));
      if (typeof c.latitude !== "number" || c.latitude < -90 || c.latitude > 90) {
        fail(file, `"coordinates.latitude" must be a number between -90 and 90`);
      }
      if (typeof c.longitude !== "number" || c.longitude < -180 || c.longitude > 180) {
        fail(file, `"coordinates.longitude" must be a number between -180 and 180`);
      }
    }
  }

  if (e.image !== undefined) validateImage(file, e.image);

  for (const field of ["createdAtISO", "updatedAtISO"]) {
    if (e[field] !== undefined && Number.isNaN(Date.parse(e[field]))) {
      fail(file, `"${field}" must be an ISO 8601 date string`);
    }
  }
}

function validateImage(file, image) {
  if (typeof image !== "object" || image === null || Array.isArray(image)) {
    fail(file, `"image" must be an object with "file" and "alt"`);
    return;
  }
  checkKeys(file, "image", image, IMAGE_KEYS);
  if (!isNonEmptyString(image.alt)) fail(file, `"image.alt" is required: say what the photo shows`);
  checkOptionalString(file, "image.credit", image.credit);

  if (!isNonEmptyString(image.file)) {
    fail(file, `"image.file" is required`);
    return;
  }
  const name = image.file;
  if (!IMAGE_FILE_PATTERN.test(name) || !IMAGE_EXTENSIONS.has(extname(name))) {
    fail(file, `"image.file" "${name}" must be a lowercase kebab-case name ending in .jpg, .jpeg, .png, or .webp`);
    return;
  }
  const path = join(imagesDir, name);
  if (!existsSync(path)) {
    fail(file, `"image.file" "${name}" is not in content/images/`);
    return;
  }
  const bytes = statSync(path).size;
  if (bytes > IMAGE_MAX_BYTES) {
    const kb = Math.round(bytes / 1024);
    fail(file, `content/images/${name} is ${kb} KB; keep photos under ${IMAGE_MAX_BYTES / 1024} KB (about 1200 px on the long side as a JPEG)`);
    return;
  }
  const problem = imageProblem(name, readFileSync(path));
  if (problem) fail(file, `content/images/${name} ${problem}`);
}

// ---------------------------------------------------------------------------
// Photo bytes. A photo that is cut off or saved under the wrong extension
// passes the size check and then fails inside the app, where nobody sees the
// error until a guest opens the entry. These checks walk each format's
// container structure: JPEG marker segments through to the end-of-image
// marker, PNG chunks with their checksums through to IEND, and the WebP RIFF
// header against the file length. They are not a pixel decode, so a photo
// that passes can still look wrong, but it cannot be truncated, empty, or a
// different format in disguise.
// ---------------------------------------------------------------------------

/** What is wrong with the photo's bytes for its extension, or null when they look complete. */
function imageProblem(name, data) {
  switch (extname(name)) {
    case ".jpg":
    case ".jpeg":
      return jpegProblem(data);
    case ".png":
      return pngProblem(data);
    case ".webp":
      return webpProblem(data);
    default:
      return "has an unsupported extension";
  }
}

const JPEG_EOI = Buffer.from([0xff, 0xd9]);

/** Walks the JPEG marker segments up to the scan, then requires the end-of-image marker after it. */
function jpegProblem(data) {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) {
    return "does not start with a JPEG header; is it really a JPEG?";
  }
  let offset = 2;
  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return `has a malformed JPEG segment at byte ${offset}`;
    const marker = data[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte ahead of a marker
      continue;
    }
    if (marker === 0xd9) return "has no JPEG image data";
    if (marker === 0xda) {
      // Start of scan: entropy-coded data follows. Inside it every 0xff is
      // followed by 0x00 or a restart marker, so 0xff 0xd9 can only be the
      // end-of-image marker.
      return data.indexOf(JPEG_EOI, offset + 2) === -1
        ? "is missing the JPEG end-of-image marker; the file may be truncated"
        : null;
    }
    if ((marker >= 0xd0 && marker <= 0xd8) || marker === 0x01) {
      offset += 2; // standalone marker with no length
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    if (length < 2) return `has a malformed JPEG segment at byte ${offset}`;
    offset += 2 + length;
  }
  return "ends before its JPEG image data; the file may be truncated";
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Walks the PNG chunks, checking each checksum, until IEND. */
function pngProblem(data) {
  if (data.length < PNG_SIGNATURE.length || !data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return "does not start with a PNG header; is it really a PNG?";
  }
  let offset = PNG_SIGNATURE.length;
  let sawHeader = false;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString("latin1", offset + 4, offset + 8);
    if (!sawHeader && type !== "IHDR") return "does not begin with a PNG IHDR chunk";
    sawHeader = true;
    const end = offset + 12 + length;
    if (end > data.length) return `is cut off inside its PNG ${type} chunk; the file may be truncated`;
    if (crc32(data.subarray(offset + 4, end - 4)) !== data.readUInt32BE(end - 4)) {
      return `has a corrupt PNG ${type} chunk (checksum mismatch)`;
    }
    if (type === "IEND") return null;
    offset = end;
  }
  return "is missing its PNG IEND chunk; the file may be truncated";
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** CRC-32 as PNG uses it, over a chunk's type and data. */
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const WEBP_FIRST_CHUNKS = new Set(["VP8 ", "VP8L", "VP8X"]);

/** Checks the RIFF container: its declared length must fit the file and the first chunk must be a WebP bitstream. */
function webpProblem(data) {
  if (data.length < 16 || data.toString("latin1", 0, 4) !== "RIFF" || data.toString("latin1", 8, 12) !== "WEBP") {
    return "does not start with a WebP header; is it really a WebP?";
  }
  const declared = data.readUInt32LE(4) + 8;
  if (declared > data.length) {
    return `is ${data.length} bytes but its WebP header declares ${declared}; the file may be truncated`;
  }
  const chunk = data.toString("latin1", 12, 16);
  if (!WEBP_FIRST_CHUNKS.has(chunk)) return `has an unexpected first WebP chunk "${chunk}"`;
  return null;
}

/** Image files nobody references. Reported, not failed, so a photo can land a commit before its entry. */
function unusedImages(entries) {
  if (!existsSync(imagesDir)) return [];
  const used = new Set(entries.map((e) => e.image?.file).filter(Boolean));
  return readdirSync(imagesDir)
    .filter((f) => IMAGE_EXTENSIONS.has(extname(f)) && !used.has(f))
    .sort();
}

function checkConsistency(entries) {
  const seenIds = new Map();
  const parkNames = new Map();
  const landNames = new Map();
  const attractionNames = new Map();

  const expectSame = (map, key, value, file, what) => {
    if (!value) return;
    const prev = map.get(key);
    if (prev && prev.value !== value) {
      fail(file, `${what} for "${key}" is "${value}" but ${prev.file} says "${prev.value}"`);
    } else if (!prev) {
      map.set(key, { value, file });
    }
  };

  for (const { file, entry: e } of entries) {
    if (seenIds.has(e.id)) fail(file, `duplicate id "${e.id}" (also in ${seenIds.get(e.id)})`);
    seenIds.set(e.id, file);
    expectSame(parkNames, e.parkId, e.display?.parkName, file, "display.parkName");
    expectSame(landNames, `${e.parkId}/${e.landId}`, e.display?.landName, file, "display.landName");
    expectSame(
      attractionNames,
      `${e.parkId}/${e.landId}/${e.attractionId}`,
      e.display?.attractionName,
      file,
      "display.attractionName"
    );
  }
}

function loadEntries() {
  if (!existsSync(contentDir)) {
    console.error(`Content directory not found: ${contentDir}`);
    process.exit(1);
  }
  const files = readdirSync(contentDir).filter((f) => f.endsWith(".json")).sort();
  const entries = [];
  for (const file of files) {
    const rel = `content/entries/${file}`;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(contentDir, file), "utf8"));
    } catch (err) {
      fail(rel, `invalid JSON (${err.message})`);
      continue;
    }
    validateEntry(rel, parsed);
    entries.push({ file: rel, entry: parsed });
  }
  checkConsistency(entries);
  return entries.map((x) => x.entry);
}

function renderImages(entries) {
  const lines = entries
    .filter((e) => e.image)
    .map((e) => `  ${JSON.stringify(e.id)}: require(${JSON.stringify(`../../content/images/${e.image.file}`)}),`);
  return [
    "// GENERATED FILE. Do not edit by hand.",
    '// Source: the "image" field of content/entries/*.json and the files in content/images/.',
    "// Rebuild with `npm run content:build`.",
    'import type { ImageSourcePropType } from "react-native";',
    "",
    "/** Bundled reference photos by entry id. Metro needs each require to be a literal. */",
    lines.length > 0
      ? `export const images: Record<string, ImageSourcePropType> = {\n${lines.join("\n")}\n};`
      : "export const images: Record<string, ImageSourcePropType> = {};",
    "",
  ].join("\n");
}

function render(entries) {
  const body = JSON.stringify(entries, null, 2);
  return [
    "// GENERATED FILE. Do not edit by hand.",
    "// Source: content/entries/*.json. Rebuild with `npm run content:build`.",
    'import type { HiddenMickeyEntry } from "./types";',
    "",
    `export const entries: HiddenMickeyEntry[] = ${body};`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Park facts: history and trivia about a destination, shown on its Park screen.
// A fact targets one parkId or a whole region, both taken from destinations.json.
// ---------------------------------------------------------------------------

const FACT_KEYS = new Set(["id", "parkId", "region", "title", "body", "createdAtISO", "updatedAtISO"]);

function loadDestinations() {
  const list = JSON.parse(readFileSync(destinationsFile, "utf8"));
  return {
    parkIds: new Set(list.map((d) => d.parkId)),
    regions: new Set(list.map((d) => d.region)),
  };
}

function validateFact(file, f, destinations) {
  if (typeof f !== "object" || f === null || Array.isArray(f)) {
    fail(file, "must be a JSON object");
    return;
  }
  checkKeys(file, "fact", f, FACT_KEYS);

  for (const field of ["id", "title", "body"]) {
    if (!isNonEmptyString(f[field])) fail(file, `missing required string "${field}"`);
  }
  if (isNonEmptyString(f.id)) {
    if (!ID_PATTERN.test(f.id)) fail(file, `id "${f.id}" must be lowercase kebab-case`);
    if (basename(file, ".json") !== f.id) fail(file, `file name must match id "${f.id}"`);
  }

  const hasPark = f.parkId !== undefined;
  const hasRegion = f.region !== undefined;
  if (hasPark === hasRegion) {
    fail(file, `set exactly one of "parkId" or "region"`);
  }
  if (hasPark && !destinations.parkIds.has(f.parkId)) {
    fail(file, `"parkId" "${f.parkId}" is not listed in content/destinations.json`);
  }
  if (hasRegion && !destinations.regions.has(f.region)) {
    fail(file, `"region" "${f.region}" is not listed in content/destinations.json`);
  }

  for (const field of ["createdAtISO", "updatedAtISO"]) {
    if (f[field] !== undefined && Number.isNaN(Date.parse(f[field]))) {
      fail(file, `"${field}" must be an ISO 8601 date string`);
    }
  }
}

function loadFacts() {
  // The facts folder is optional so a content set without any still builds.
  if (!existsSync(factsDir)) return [];
  const destinations = loadDestinations();
  const files = readdirSync(factsDir).filter((f) => f.endsWith(".json")).sort();
  const facts = [];
  const seenIds = new Map();
  for (const file of files) {
    const rel = `content/facts/${file}`;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(factsDir, file), "utf8"));
    } catch (err) {
      fail(rel, `invalid JSON (${err.message})`);
      continue;
    }
    validateFact(rel, parsed, destinations);
    if (parsed && typeof parsed.id === "string") {
      if (seenIds.has(parsed.id)) fail(rel, `duplicate id "${parsed.id}" (also in ${seenIds.get(parsed.id)})`);
      seenIds.set(parsed.id, rel);
    }
    facts.push(parsed);
  }
  return facts;
}

function renderFacts(facts) {
  const body = JSON.stringify(facts, null, 2);
  return [
    "// GENERATED FILE. Do not edit by hand.",
    "// Source: content/facts/*.json. Rebuild with `npm run content:build`.",
    'import type { ParkFact } from "./types";',
    "",
    `export const facts: ParkFact[] = ${body};`,
    "",
  ].join("\n");
}

const entries = loadEntries();
const facts = loadFacts();
const orphans = unusedImages(entries);
for (const name of orphans) console.log(`note: content/images/${name} is not referenced by any entry yet`);
if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const outputs = [
  { path: outFile, label: "src/data/entries.generated.ts", content: render(entries) },
  { path: factsOutFile, label: "src/data/facts.generated.ts", content: renderFacts(facts) },
  { path: imagesOutFile, label: "src/data/images.generated.ts", content: renderImages(entries) },
];
const photoCount = entries.filter((e) => e.image).length;
// Git may check the generated file out with CRLF line endings on Windows;
// compare content, not line terminators.
const normalize = (s) => s.replace(/\r\n/g, "\n");
if (checkOnly) {
  for (const { path, label, content } of outputs) {
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (normalize(current) !== normalize(content)) {
      console.error(`${label} is out of date. Run \`npm run content:build\`.`);
      process.exit(1);
    }
  }
  console.log(`Validated ${entries.length} entries, ${facts.length} facts, and ${photoCount} photos; generated files are up to date.`);
} else {
  for (const { path, content } of outputs) writeFileSync(path, content);
  console.log(`Validated ${entries.length} entries, ${facts.length} facts, and ${photoCount} photos and wrote the generated files.`);
}

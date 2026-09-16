#!/usr/bin/env node
/**
 * Builds src/data/entries.generated.ts from content/entries/*.json.
 *
 * Every entry lives in its own JSON file so new Hidden Mickeys can be added
 * without touching app code. This script validates each file against the
 * HiddenMickeyEntry schema, checks cross-entry consistency, and emits a typed
 * TypeScript module the app imports.
 *
 * Usage:
 *   node scripts/build-entries.mjs          # validate and write the generated file
 *   node scripts/build-entries.mjs --check  # validate and fail if the generated file is stale
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content", "entries");
const outFile = join(root, "src", "data", "entries.generated.ts");
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
  "coordinates", "createdAtISO", "updatedAtISO",
]);
const DISPLAY_KEYS = new Set(["parkName", "landName", "attractionName", "entryTitle"]);
const VIEWING_KEYS = new Set(["motion", "lighting", "angle", "crowding", "distance", "notes"]);
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

  for (const field of ["createdAtISO", "updatedAtISO"]) {
    if (e[field] !== undefined && Number.isNaN(Date.parse(e[field]))) {
      fail(file, `"${field}" must be an ISO 8601 date string`);
    }
  }
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

const entries = loadEntries();
if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const output = render(entries);
if (checkOnly) {
  const current = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  if (current !== output) {
    console.error("src/data/entries.generated.ts is out of date. Run `npm run content:build`.");
    process.exit(1);
  }
  console.log(`Validated ${entries.length} entries; generated file is up to date.`);
} else {
  writeFileSync(outFile, output);
  console.log(`Validated ${entries.length} entries and wrote src/data/entries.generated.ts.`);
}

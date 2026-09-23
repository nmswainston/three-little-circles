#!/usr/bin/env node
/**
 * Builds src/data/entries.generated.ts from content/entries/*.json and
 * src/data/facts.generated.ts from content/facts/*.json.
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
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content", "entries");
const factsDir = join(root, "content", "facts");
const destinationsFile = join(root, "content", "destinations.json");
const outFile = join(root, "src", "data", "entries.generated.ts");
const factsOutFile = join(root, "src", "data", "facts.generated.ts");
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
if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const outputs = [
  { path: outFile, label: "src/data/entries.generated.ts", content: render(entries) },
  { path: factsOutFile, label: "src/data/facts.generated.ts", content: renderFacts(facts) },
];
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
  console.log(`Validated ${entries.length} entries and ${facts.length} facts; generated files are up to date.`);
} else {
  for (const { path, content } of outputs) writeFileSync(path, content);
  console.log(`Validated ${entries.length} entries and ${facts.length} facts and wrote the generated files.`);
}

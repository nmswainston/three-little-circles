#!/usr/bin/env node
/**
 * Bulk-imports finds from a CSV export of a spreadsheet into content/entries/.
 *
 *   node scripts/import-csv.mjs path/to/finds.csv            # write entry files
 *   node scripts/import-csv.mjs path/to/finds.csv --dry-run  # report only
 *   node scripts/import-csv.mjs path/to/finds.csv --overwrite  # replace entries whose id already exists
 *
 * Columns are matched by header name, case-insensitively, using the names in
 * content/TEMPLATE.csv. If your spreadsheet uses different headers, list them
 * in content/import-map.json as {"<entry field>": "<your header>"}.
 *
 * Land and attraction ids are reused from existing entries in the same park
 * when the names match, so new finds group with the ones already there.
 * Afterwards run `npm run content:build` to validate and regenerate.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entriesDir = join(root, "content", "entries");
const destinations = JSON.parse(readFileSync(join(root, "content", "destinations.json"), "utf8"));

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");

if (!csvPath) {
  console.error("Usage: node scripts/import-csv.mjs <file.csv> [--dry-run] [--overwrite]");
  process.exit(1);
}
if (!existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Column mapping: entry field -> header name in the CSV
// ---------------------------------------------------------------------------
const DEFAULT_MAP = {
  park: "park",
  region: "region",
  land: "land",
  attraction: "attraction",
  title: "title",
  entryType: "type",
  locationType: "location type",
  difficulty: "difficulty",
  description: "description",
  scene: "scene",
  exactSpot: "exact spot",
  orientation: "orientation",
  bestTip: "best tip",
  funFacts: "fun facts",
  motion: "motion",
  lighting: "lighting",
  angle: "angle",
  crowding: "crowding",
  distance: "distance",
  viewingNotes: "viewing notes",
  confidence: "confidence",
  verification: "verification",
  status: "status",
  accessNotes: "access notes",
  sourceId: "source id",
  sourceUrl: "source url",
  areaContext: "area",
  latitude: "latitude",
  longitude: "longitude",
  coordinates: "coordinates",
  id: "id",
  landId: "land id",
  attractionId: "attraction id",
};

const mapFile = join(root, "content", "import-map.json");
const columnMap = { ...DEFAULT_MAP, ...(existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, "utf8")) : {}) };

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180: quotes, doubled quotes, embedded newlines, CRLF)
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const clean = (s) => String(s ?? "").trim();
const snake = (s) =>
  norm(s)
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const kebab = (s) =>
  norm(s)
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const ENUMS = {
  entryType: ["FIND", "FACT"],
  locationType: ["Queue", "Ride", "Pre-show", "Outdoor", "Indoor"],
  difficulty: ["Easy", "Medium", "Hard"],
  orientation: ["Upright", "Upside-down", "Sideways"],
  confidence: ["Obvious", "Strong", "Interpretive"],
  verification: ["In-person", "Photo", "Community", "Documented", "Unknown"],
  status: ["Current", "Unverified", "Seasonal", "Variable", "Removed", "Lead"],
  areaContext: ["Entrance", "Queue", "Loading", "Ride", "Dock", "Post-show", "Exit", "Lobby", "Walkway", "Outdoor Display", "Shop"],
};

/** Match a cell to an enum value ignoring case, spaces, and hyphens. */
function matchEnum(field, value) {
  const v = norm(value).replace(/[\s_-]+/g, "");
  if (!v) return undefined;
  const hit = ENUMS[field].find((opt) => norm(opt).replace(/[\s_-]+/g, "") === v);
  return hit ?? null; // null = present but not recognized
}

function resolvePark(parkCell, regionCell) {
  const raw = clean(parkCell);
  if (!raw) return { error: "park is empty" };
  const byId = destinations.find((d) => d.parkId === raw);
  if (byId) return { destination: byId };

  // "Disneyland Park (Paris)" or a separate region column
  const m = raw.match(/^(.*?)\s*\((.*?)\)\s*$/);
  const name = norm(m ? m[1] : raw);
  const region = norm(regionCell || (m ? m[2] : ""));
  const byName = destinations.filter((d) => norm(d.name) === name);
  if (byName.length === 0) return { error: `unknown park "${raw}" (use a name from content/destinations.json or its parkId)` };
  if (byName.length === 1) return { destination: byName[0] };
  const withRegion = byName.find((d) => norm(d.region) === region);
  if (withRegion) return { destination: withRegion };
  return { error: `"${raw}" exists in several regions; add a region column or write it as "${raw} (Florida)"` };
}

// Existing entries: reuse land/attraction ids for matching names within a park.
const existing = readdirSync(entriesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(entriesDir, f), "utf8")));
const landIdByName = new Map();
const attractionByName = new Map();
for (const e of existing) {
  if (e.display?.landName) landIdByName.set(`${e.parkId}|${norm(e.display.landName)}`, e.landId);
  if (e.display?.attractionName) {
    attractionByName.set(`${e.parkId}|${norm(e.display.attractionName)}`, { attractionId: e.attractionId, landId: e.landId, landName: e.display.landName });
  }
}
const existingIds = new Set(existing.map((e) => e.id));

// ---------------------------------------------------------------------------
// Convert rows
// ---------------------------------------------------------------------------
const rows = parseCsv(readFileSync(csvPath, "utf8"));
if (rows.length < 2) {
  console.error("The CSV has a header row but no data rows.");
  process.exit(1);
}
const headers = rows[0].map(norm);
const col = (field) => {
  const name = norm(columnMap[field]);
  const idx = headers.indexOf(name);
  return idx;
};
const missingRequired = ["park", "attraction", "title", "description", "scene", "exactSpot", "difficulty", "locationType"]
  .filter((f) => col(f) === -1)
  .map((f) => columnMap[f]);
if (missingRequired.length > 0) {
  console.error(`Missing required column(s): ${missingRequired.join(", ")}.`);
  console.error(`Headers found: ${rows[0].map((h) => clean(h)).join(", ")}`);
  console.error("Rename the columns, or map yours in content/import-map.json.");
  process.exit(1);
}

const now = new Date().toISOString();
const results = [];
const batchIds = new Set();

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const cell = (field) => (col(field) === -1 ? "" : clean(row[col(field)]));
  const line = r + 1;
  const problems = [];

  const parkResult = resolvePark(cell("park"), cell("region"));
  if (parkResult.error) problems.push(parkResult.error);
  const destination = parkResult.destination;

  const attractionName = cell("attraction");
  const landName = cell("land");
  const title = cell("title");
  const description = cell("description");
  const scene = cell("scene");
  const exactSpot = cell("exactSpot");
  if (!attractionName) problems.push("attraction is empty");
  if (!title) problems.push("title is empty");
  if (!description) problems.push("description is empty");
  if (!scene) problems.push("scene is empty");
  if (!exactSpot) problems.push("exact spot is empty");

  const enumOrProblem = (field, required = false) => {
    const value = cell(field);
    const matched = matchEnum(field, value);
    if (matched === null) problems.push(`${columnMap[field]} "${value}" is not one of ${ENUMS[field].join(", ")}`);
    if (matched === undefined && required) problems.push(`${columnMap[field]} is empty`);
    return matched ?? undefined;
  };
  const entryType = enumOrProblem("entryType") ?? "FIND";
  const locationType = enumOrProblem("locationType", true);
  const difficulty = enumOrProblem("difficulty", true);
  const orientation = enumOrProblem("orientation");
  const confidence = enumOrProblem("confidence");
  const verification = enumOrProblem("verification");
  const status = enumOrProblem("status");
  const areaContext = enumOrProblem("areaContext");
  const sourceUrl = cell("sourceUrl");
  if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) problems.push(`source url "${sourceUrl}" is not an http(s) URL`);

  // Coordinates: separate columns or one "lat, lng" cell
  let coordinates;
  let lat = cell("latitude");
  let lng = cell("longitude");
  const combined = cell("coordinates");
  if (!lat && !lng && combined) [lat, lng] = combined.split(/[,\s]+/).map((s) => s.trim());
  if (lat || lng) {
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
      coordinates = { latitude: la, longitude: ln };
    } else {
      problems.push(`coordinates "${lat}, ${lng}" are not valid decimal degrees`);
    }
  }

  // Ids: reuse what the park already has for the same names
  let landId = cell("landId") ? snake(cell("landId")) : undefined;
  let attractionId = cell("attractionId") ? snake(cell("attractionId")) : undefined;
  let resolvedLandName = landName;
  if (destination) {
    const known = attractionByName.get(`${destination.parkId}|${norm(attractionName)}`);
    if (known) {
      attractionId = attractionId ?? known.attractionId;
      landId = landId ?? known.landId;
      resolvedLandName = resolvedLandName || known.landName;
    }
    if (!landId && landName) landId = landIdByName.get(`${destination.parkId}|${norm(landName)}`) ?? snake(landName);
    if (!attractionId) attractionId = snake(attractionName);
    if (!landId) problems.push("land is empty and this attraction is not in the park yet, so the land cannot be inferred");
  }

  let id = cell("id") ? kebab(cell("id")) : kebab(`${attractionName}-${title}`);
  if (!id) problems.push("could not build an id from the attraction and title");
  if (batchIds.has(id)) problems.push(`duplicate id "${id}" in this file`);
  batchIds.add(id);
  const exists = existingIds.has(id);
  if (exists && !overwrite) problems.push(`entry "${id}" already exists (use --overwrite to replace it)`);

  const funFacts = cell("funFacts")
    .split(/\r?\n|\s*\|\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const viewing = {};
  for (const key of ["motion", "lighting", "angle", "crowding", "distance"]) {
    const v = cell(key);
    if (v) viewing[key] = v;
  }
  if (cell("viewingNotes")) viewing.notes = cell("viewingNotes");

  const entry = destination && {
    id,
    parkId: destination.parkId,
    landId,
    attractionId,
    display: {
      parkName: destination.name,
      ...(resolvedLandName ? { landName: resolvedLandName } : {}),
      attractionName,
      entryTitle: title,
    },
    entryType,
    locationType,
    difficulty,
    ...(areaContext ? { areaContext } : {}),
    description,
    whereToLook: { scene, exactSpot, ...(orientation ? { orientation } : {}) },
    ...(cell("bestTip") ? { bestTip: cell("bestTip") } : {}),
    ...(funFacts.length ? { funFacts } : {}),
    ...(Object.keys(viewing).length ? { viewing } : {}),
    ...(confidence ? { confidence } : {}),
    ...(verification ? { verification } : {}),
    ...(status ? { status } : {}),
    ...(cell("accessNotes") ? { accessNotes: cell("accessNotes") } : {}),
    ...(coordinates ? { coordinates } : {}),
    ...(cell("sourceId") ? { sourceId: cell("sourceId").toUpperCase() } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    createdAtISO: exists ? existing.find((e) => e.id === id)?.createdAtISO ?? now : now,
    updatedAtISO: now,
  };

  results.push({ line, id, title, problems, entry, replaced: exists });
}

// ---------------------------------------------------------------------------
// Report and write
// ---------------------------------------------------------------------------
const bad = results.filter((r) => r.problems.length > 0);
const good = results.filter((r) => r.problems.length === 0);

for (const r of bad) {
  console.log(`row ${r.line}  ${r.title || "(no title)"}`);
  for (const p of r.problems) console.log(`    - ${p}`);
}
if (bad.length > 0) console.log("");

if (dryRun) {
  for (const r of good) console.log(`would write content/entries/${r.id}.json${r.replaced ? "  (replacing existing)" : ""}`);
} else {
  mkdirSync(entriesDir, { recursive: true });
  for (const r of good) {
    writeFileSync(join(entriesDir, `${r.id}.json`), JSON.stringify(r.entry, null, 2) + "\n");
    console.log(`wrote content/entries/${r.id}.json${r.replaced ? "  (replaced)" : ""}`);
  }
}

console.log(
  `\n${good.length} row${good.length === 1 ? "" : "s"} ${dryRun ? "ready" : "imported"}, ${bad.length} skipped with problems.` +
    (good.length && !dryRun ? " Now run: npm run content:build" : "")
);
process.exit(bad.length > 0 ? 1 : 0);

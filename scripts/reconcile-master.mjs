#!/usr/bin/env node
/**
 * Compares content/entries/ against a CSV export of the research spreadsheet's
 * Master tab and reports the differences. It never writes anything.
 *
 *   node scripts/reconcile-master.mjs path/to/master.csv
 *
 * Entries link to spreadsheet rows through `sourceId` (the sheet's find_id).
 * The report lists:
 *   - spreadsheet rows with no entry yet, grouped by the sheet's status
 *   - entries whose sourceId no longer appears in the spreadsheet
 *   - entries whose status disagrees with the spreadsheet's status
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entriesDir = join(root, "content", "entries");

const csvPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!csvPath) {
  console.error("Usage: node scripts/reconcile-master.mjs <master.csv>");
  process.exit(1);
}
if (!existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

/** Sheet status -> entry status. Statuses missing here have no app equivalent. */
const STATUS_MAP = {
  "current": "Current",
  "needs reverification": "Unverified",
  "seasonal/time-specific": "Seasonal",
  "variable/prop-dependent": "Variable",
  "historical/removed": "Removed",
};

// RFC 4180 CSV: quotes, doubled quotes, embedded newlines, CRLF.
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

const norm = (s) => String(s ?? "").trim().toLowerCase();

const rows = parseCsv(readFileSync(csvPath, "utf8"));
if (rows.length < 2) {
  console.error("The CSV has a header row but no data rows.");
  process.exit(1);
}
const headers = rows[0].map(norm);
const col = (name) => headers.indexOf(name);
for (const required of ["find_id", "status"]) {
  if (col(required) === -1) {
    console.error(`Missing column "${required}". Export the Master tab with its header row.`);
    process.exit(1);
  }
}
const pick = (row, name) => (col(name) === -1 ? "" : String(row[col(name)] ?? "").trim());

const sheet = new Map();
for (const row of rows.slice(1)) {
  const id = pick(row, "find_id").toUpperCase();
  if (!id) continue;
  sheet.set(id, {
    id,
    status: pick(row, "status"),
    category: pick(row, "category"),
    where: [pick(row, "park") || pick(row, "land_area"), pick(row, "attraction_venue")].filter(Boolean).join(" / "),
    description: pick(row, "find_description"),
  });
}

const entries = readdirSync(entriesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(entriesDir, f), "utf8")));
const bySourceId = new Map();
for (const e of entries) if (e.sourceId) bySourceId.set(String(e.sourceId).toUpperCase(), e);

// 1. Sheet rows with no entry, grouped by status.
const missing = [...sheet.values()].filter((r) => !bySourceId.has(r.id));
const byStatus = new Map();
for (const r of missing) {
  const key = r.status || "(no status)";
  if (!byStatus.has(key)) byStatus.set(key, []);
  byStatus.get(key).push(r);
}
console.log(`Spreadsheet rows: ${sheet.size}. Entries with a sourceId: ${bySourceId.size}.`);
console.log(`\nRows with no entry yet: ${missing.length}`);
for (const [status, list] of [...byStatus.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  ${status} (${list.length})`);
  for (const r of list) {
    console.log(`    ${r.id}  ${r.where}`);
    if (r.description) console.log(`        ${r.description}`);
  }
}

// 2. Entries whose sourceId is gone from the sheet.
const orphaned = [...bySourceId.entries()].filter(([id]) => !sheet.has(id));
console.log(`\nEntries whose sourceId is not in the spreadsheet: ${orphaned.length}`);
for (const [id, e] of orphaned) console.log(`    ${id}  content/entries/${e.id}.json`);

// 3. Status disagreements.
const disagreements = [];
for (const [id, e] of bySourceId) {
  const row = sheet.get(id);
  if (!row) continue;
  const expected = STATUS_MAP[norm(row.status)];
  if (expected === undefined) {
    disagreements.push({ id, e, sheetStatus: row.status, expected: "(no app equivalent)" });
  } else if ((e.status ?? "Current") !== expected) {
    disagreements.push({ id, e, sheetStatus: row.status, expected });
  }
}
console.log(`\nEntries whose status disagrees with the spreadsheet: ${disagreements.length}`);
for (const d of disagreements) {
  console.log(`    ${d.id}  content/entries/${d.e.id}.json  app: ${d.e.status ?? "(none, reads as Current)"}  sheet: ${d.sheetStatus} -> ${d.expected}`);
}

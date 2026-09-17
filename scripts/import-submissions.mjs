#!/usr/bin/env node
/**
 * Pulls approved community sightings out of Supabase and writes one draft
 * entry per row to content/inbox/. Drafts carry TODO markers on the fields a
 * submitter can't know; you finish them, move them to content/entries/, and
 * run `npm run content:build`.
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, from the environment or a
 * local .env file. The service role key bypasses row-level security, so this
 * script is for your machine only.
 *
 * Usage:
 *   node scripts/import-submissions.mjs            # write drafts, stamp rows as imported
 *   node scripts/import-submissions.mjs --dry-run  # show what would be written
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inboxDir = join(root, "content", "inbox");
const dryRun = process.argv.includes("--dry-run");

function loadDotEnv() {
  const file = join(root, ".env");
  if (!existsSync(file)) return {};
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !line.trim().startsWith("#")) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...loadDotEnv(), ...process.env };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (see supabase/README.md).");
  process.exit(1);
}

const slugify = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: rows, error } = await supabase
  .from("submissions")
  .select("*")
  .eq("status", "approved")
  .is("imported_at", null)
  .order("created_at", { ascending: true });

if (error) {
  console.error("Could not read submissions:", error.message);
  process.exit(1);
}
if (!rows || rows.length === 0) {
  console.log("No approved submissions waiting for import.");
  process.exit(0);
}

if (!dryRun) mkdirSync(inboxDir, { recursive: true });

const now = new Date().toISOString();
const written = [];

for (const row of rows) {
  const base = slugify(`${row.attraction_name}-${row.title}`);
  let id = base;
  let n = 2;
  while (existsSync(join(inboxDir, `${id}.json`)) || written.some((w) => w.id === id)) id = `${base}-${n++}`;

  const draft = {
    id,
    parkId: row.park_id,
    landId: `TODO-${slugify(row.land_name || "land")}`,
    attractionId: slugify(row.attraction_name),
    display: {
      parkName: row.park_name,
      landName: row.land_name || "TODO",
      attractionName: row.attraction_name,
      entryTitle: row.title,
    },
    entryType: "FIND",
    locationType: row.location_type,
    difficulty: row.difficulty,
    description: `TODO rewrite in the app's voice. Submitter wrote: ${row.where_to_look}`,
    whereToLook: {
      scene: "TODO",
      exactSpot: "TODO",
      orientation: "Upright",
    },
    confidence: "Interpretive",
    verification: "Community",
    createdAtISO: now,
    updatedAtISO: now,
    _submission: {
      note: "Delete this block before moving the file into content/entries.",
      id: row.id,
      submittedAt: row.created_at,
      region: row.region,
      photoPath: row.photo_path,
      credit: row.credit_ok ? row.contact_name : null,
      platform: row.platform,
      appVersion: row.app_version,
    },
  };

  const file = join(inboxDir, `${id}.json`);
  if (dryRun) {
    console.log(`would write content/inbox/${id}.json  (${row.park_name} / ${row.attraction_name}: ${row.title})`);
  } else {
    writeFileSync(file, JSON.stringify(draft, null, 2) + "\n");
    console.log(`wrote content/inbox/${id}.json`);
  }
  written.push({ id, rowId: row.id });
}

if (!dryRun) {
  const { error: stampError } = await supabase
    .from("submissions")
    .update({ imported_at: now })
    .in("id", written.map((w) => w.rowId));
  if (stampError) {
    console.error("Drafts were written but rows could not be marked as imported:", stampError.message);
    process.exit(1);
  }
}

console.log(`${written.length} draft${written.length === 1 ? "" : "s"} ${dryRun ? "pending" : "written"}. Finish the TODO fields, move each file to content/entries/, then run npm run content:build.`);

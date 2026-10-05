#!/usr/bin/env node
/**
 * Pulls approved community sightings out of Supabase and writes one draft
 * entry per row to content/inbox/. Drafts carry TODO markers on the fields a
 * submitter can't know; you finish them, move them to content/entries/, and
 * run `npm run content:build`.
 *
 * A photo of a find already in the guide (for_entry_id set) is saved to
 * content/inbox/photos/ instead, and the script prints the content:photo
 * command that resizes it, strips its metadata, and wires it into the entry.
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
import { draftFor, isPhotoSubmission, photoCommand, photoFileName, slugify } from "./lib/submissions-import.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inboxDir = join(root, "content", "inbox");
const photosDir = join(inboxDir, "photos");
const BUCKET = "submission-photos";
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
const photos = [];
const failed = [];

for (const row of rows) {
  if (isPhotoSubmission(row)) {
    const file = photoFileName(row);
    const relative = `content/inbox/photos/${file}`;
    const command = photoCommand(row, relative);
    if (!existsSync(join(root, "content", "entries", `${row.for_entry_id}.json`))) {
      console.warn(`note: no content/entries/${row.for_entry_id}.json on this checkout. The entry may be renamed, or in a branch not merged yet.`);
    }
    if (!row.photo_path) {
      console.error(`row ${row.id} is a photo for ${row.for_entry_id} but has no photo; left pending import.`);
      failed.push(row.id);
      continue;
    }
    if (dryRun) {
      console.log(`would save ${relative} from the bucket\n  then run: ${command}`);
      photos.push({ rowId: row.id });
      continue;
    }
    const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(row.photo_path);
    if (downloadError || !data) {
      console.error(`could not download ${row.photo_path} for row ${row.id}: ${downloadError?.message ?? "no data"}. Left pending import.`);
      failed.push(row.id);
      continue;
    }
    mkdirSync(photosDir, { recursive: true });
    writeFileSync(join(photosDir, file), Buffer.from(await data.arrayBuffer()));
    console.log(`saved ${relative}\n  then run: ${command}`);
    photos.push({ rowId: row.id });
    continue;
  }

  const base = slugify(`${row.attraction_name}-${row.title}`);
  let id = base;
  let n = 2;
  while (existsSync(join(inboxDir, `${id}.json`)) || written.some((w) => w.id === id)) id = `${base}-${n++}`;

  const draft = draftFor(row, id, now);

  const file = join(inboxDir, `${id}.json`);
  if (dryRun) {
    console.log(`would write content/inbox/${id}.json  (${row.park_name} / ${row.attraction_name}: ${row.title})`);
  } else {
    writeFileSync(file, JSON.stringify(draft, null, 2) + "\n");
    console.log(`wrote content/inbox/${id}.json`);
  }
  written.push({ id, rowId: row.id });
}

const imported = [...written, ...photos].map((w) => w.rowId);
if (!dryRun && imported.length > 0) {
  const { error: stampError } = await supabase.from("submissions").update({ imported_at: now }).in("id", imported);
  if (stampError) {
    console.error("Files were written but rows could not be marked as imported:", stampError.message);
    process.exit(1);
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
console.log(`${plural(written.length, "draft")} and ${plural(photos.length, "photo")} ${dryRun ? "pending" : "written"}.`);
if (written.length > 0) console.log("Finish the TODO fields, move each draft to content/entries/, then run npm run content:build.");
if (photos.length > 0) console.log("Run each content:photo command above with a real --alt, then commit the entry and its image.");
if (failed.length > 0) {
  console.error(`${plural(failed.length, "row")} could not be imported and stay pending import.`);
  process.exit(1);
}

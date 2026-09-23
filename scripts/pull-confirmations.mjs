#!/usr/bin/env node
/**
 * Pulls "Still there?" reports out of Supabase and bakes a per-entry summary
 * into src/data/confirmations.generated.ts, so the entry screen can say when a
 * find was last seen without the app ever reading the table.
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, from the environment or a
 * local .env file. The service role key bypasses row-level security, so this
 * script is for your machine only.
 *
 * Usage:
 *   node scripts/pull-confirmations.mjs            # write the generated file
 *   node scripts/pull-confirmations.mjs --dry-run  # print the summary instead
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { summarizeConfirmations, renderGeneratedModule } from "./lib/summarize-confirmations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "src", "data", "confirmations.generated.ts");
const dryRun = process.argv.includes("--dry-run");
const WINDOW_DAYS = 90;

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

const knownIds = new Set(
  readdirSync(join(root, "content", "entries"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => basename(f, ".json"))
);

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const now = Date.now();
const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

// Page through everything in the window. created_at alone is not a total
// order, so id breaks ties and no row can slip between pages. The project's
// max-rows setting may be lower than PAGE, so a short page only advances by
// what came back, and only an empty page ends the loop.
const rows = [];
const PAGE = 1000;
for (let from = 0; ; ) {
  const { data, error } = await supabase
    .from("confirmations")
    .select("id, entry_id, device_id, status, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error("Could not read confirmations:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;
  rows.push(...data);
  from += data.length;
}

const { summaries, unknownEntryIds } = summarizeConfirmations(rows, { knownIds, now, windowDays: WINDOW_DAYS });
const entryCount = Object.keys(summaries).length;

console.log(`${rows.length} report${rows.length === 1 ? "" : "s"} in the last ${WINDOW_DAYS} days, ${entryCount} entr${entryCount === 1 ? "y" : "ies"} with votes.`);
for (const [id, s] of Object.entries(summaries)) {
  const last = s.lastSeenISO ? `last seen ${s.lastSeenISO.slice(0, 10)}` : `never seen`;
  console.log(`  ${id}: ${s.seen} seen, ${s.missing} missing, ${last}`);
}
if (unknownEntryIds.length > 0) {
  console.log(`Ignored reports for ${unknownEntryIds.length} unknown entry id(s): ${unknownEntryIds.join(", ")}`);
}

if (dryRun) {
  console.log("\nDry run; nothing written.");
  process.exit(0);
}

writeFileSync(outFile, renderGeneratedModule(summaries, new Date(now).toISOString()));
console.log(`\nWrote ${outFile.replace(root + "/", "")}. Commit it so the app ships the latest freshness.`);

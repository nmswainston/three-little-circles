#!/usr/bin/env node
/**
 * Checks that the app can reach your Supabase project with the anon key and
 * that supabase/schema.sql has been applied. Sends no content. The one thing
 * it creates is a throwaway anonymous user, to prove anonymous sign-ins are
 * on for "Still there?" reports.
 *
 * Usage: node scripts/check-supabase.mjs   (or npm run supabase:check)
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
const anonKey = env.SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

let failed = false;
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  failed = true;
  console.log(`  FAIL  ${msg}`);
};
const skip = (msg) => console.log(`  skip  ${msg}`);

console.log("Supabase check\n");

if (!url) bad("SUPABASE_URL is not set in .env");
else ok(`SUPABASE_URL is ${url}`);

if (!anonKey) bad("SUPABASE_ANON_KEY is not set in .env (Project Settings > API Keys > anon / public)");
else ok("SUPABASE_ANON_KEY is set");

if (!url || !anonKey) {
  console.log("\nFill in .env and run this again.");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

// The anon key has no select policy, so a successful call returns no rows.
// A missing table comes back as an error instead.
{
  const { error } = await anon.from("submissions").select("id", { head: true, count: "exact" });
  if (!error) ok("submissions table exists and answers the anon key");
  else if (/does not exist|schema cache|PGRST205|42P01/i.test(`${error.code} ${error.message}`)) {
    bad("submissions table not found. Run supabase/schema.sql in the SQL Editor.");
  } else if (/Invalid API key|JWT/i.test(error.message)) {
    bad(`the anon key was rejected: ${error.message}`);
  } else {
    bad(`unexpected error from the submissions table: ${error.message}`);
  }
}

// The anon key must not be able to read the queue.
{
  const { data, error } = await anon.from("submissions").select("id").limit(1);
  if (error) bad(`reading the queue with the anon key errored instead of returning nothing: ${error.message}`);
  else if (Array.isArray(data) && data.length === 0) ok("anon key cannot read the review queue (row-level security is on)");
  else bad("anon key CAN read submissions. Row-level security is not applied; run schema.sql again.");
}

// "Still there?" reports live in their own insert-only table.
{
  const { error } = await anon.from("confirmations").select("id", { head: true, count: "exact" });
  if (!error) ok("confirmations table exists and answers the anon key");
  else if (/does not exist|schema cache|PGRST205|42P01/i.test(`${error.code} ${error.message}`)) {
    bad("confirmations table not found. Run supabase/schema.sql in the SQL Editor.");
  } else {
    bad(`unexpected error from the confirmations table: ${error.message}`);
  }
}

{
  const { data, error } = await anon.from("confirmations").select("id").limit(1);
  if (error) bad(`reading reports with the anon key errored instead of returning nothing: ${error.message}`);
  else if (Array.isArray(data) && data.length === 0) ok("anon key cannot read reports (row-level security is on)");
  else bad("anon key CAN read confirmations. Row-level security is not applied; run schema.sql again.");
}

// "Still there?" reports sign in anonymously so each row is tied to a server-issued
// id. A fresh client, so the checks above stayed on the plain anon role.
{
  const probe = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await probe.auth.signInAnonymously();
  if (!error) {
    ok("anonymous sign-ins are on (this created one throwaway anonymous user)");
    await probe.auth.signOut().catch(() => {});
  } else if (/anonymous/i.test(error.message)) {
    bad("anonymous sign-ins are off. Turn them on under Authentication > Sign In / Providers > Anonymous, or reports will fail.");
  } else {
    bad(`anonymous sign-in failed: ${error.message}`);
  }
}

if (serviceKey) {
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await service.storage.getBucket("submission-photos");
  if (error) bad(`photo bucket not found with the service role key: ${error.message}`);
  else if (data.public) bad("submission-photos bucket is public; it should be private. Run schema.sql again.");
  else ok("submission-photos bucket exists and is private");

  const { count, error: countError } = await service.from("submissions").select("id", { head: true, count: "exact" });
  if (countError) bad(`service role key could not read submissions: ${countError.message}`);
  else ok(`service role key works; ${count ?? 0} submission${count === 1 ? "" : "s"} in the table`);
} else {
  skip("SUPABASE_SERVICE_ROLE_KEY not set; bucket check needs it (only the import script uses this key)");
}

console.log(failed ? "\nSomething needs attention above." : "\nAll good. Restart npm start so the app picks up .env, then send a test suggestion from your phone.");
process.exit(failed ? 1 : 0);

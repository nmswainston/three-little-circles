#!/usr/bin/env node
/**
 * Rewrites the content files so every one puts its keys in the same order.
 *
 * Entries, facts, and challenges are each a JSON object. People add a key
 * wherever they happen to be typing, and imports write keys in their own
 * order, so over time the same field drifts around from file to file and
 * diffs fill with lines that only moved. This script reads each file under
 * content/entries, content/facts, and content/challenges and writes it back
 * as two-space JSON with its keys in the order scripts/lib/content-schema.mjs
 * lists them, nested objects included. Values never change. A key the schema
 * does not know stays, after the known ones, for the build to report.
 *
 * Usage:
 *   npm run content:format              # rewrite the files that are out of order
 *   npm run content:format -- --check   # list them and exit 1 instead of writing
 *
 * TLC_CONTENT_ROOT points the script at another project root. The tests use
 * it to run against fixtures.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CHALLENGE_KEYS, ENTRY_KEYS, ENTRY_NESTED, FACT_KEYS, isPlainObject, orderKeys } from "./lib/content-schema.mjs";

const root = process.env.TLC_CONTENT_ROOT || join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const COLLECTIONS = [
  { dir: join(root, "content", "entries"), order: ENTRY_KEYS, nested: ENTRY_NESTED },
  { dir: join(root, "content", "facts"), order: FACT_KEYS, nested: {} },
  { dir: join(root, "content", "challenges"), order: CHALLENGE_KEYS, nested: {} },
];

// Git checks text out with LF everywhere (.gitattributes), and the build
// compares content the same way, so line endings never count as a change.
const normalize = (s) => s.replace(/\r\n/g, "\n");

let total = 0;
const changed = [];
for (const { dir, order, nested } of COLLECTIONS) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const path = join(dir, name);
    const label = relative(root, path);
    const raw = readFileSync(path, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`${label}: not valid JSON (${err.message})`);
      process.exit(1);
    }
    total++;
    // Anything that is not an object is the build's problem to explain.
    if (!isPlainObject(parsed)) continue;
    const formatted = `${JSON.stringify(orderKeys(parsed, order, nested), null, 2)}\n`;
    if (normalize(raw) === formatted) continue;
    changed.push(label);
    if (!checkOnly) writeFileSync(path, formatted);
  }
}

if (changed.length === 0) {
  console.log(`All ${total} content files are in canonical order.`);
} else if (checkOnly) {
  console.error(`${changed.length} of ${total} content files are out of order:`);
  for (const label of changed) console.error(`  - ${label}`);
  console.error("Run `npm run content:format` to fix them.");
  process.exit(1);
} else {
  console.log(`Formatted ${changed.length} of ${total} content files:`);
  for (const label of changed) console.log(`  - ${label}`);
}

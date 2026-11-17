#!/usr/bin/env node
/**
 * Builds the reference-photo wishlist: which finds still have no photo, ranked
 * so the most useful shots come first, and the same list by park in walking
 * order for a day in the park.
 *
 *   node scripts/build-photo-wishlist.mjs [--top 25]
 *
 * Writes to kit/ (ignored by git):
 *   kit/photo-wishlist.md    the checklist, with the ready-to-shoot finds first
 *   kit/photo-wishlist.csv   the same finds in rank order, with blank columns
 *                            for photo_taken and notes
 *
 * Nothing in content/ is changed. Attach a photo with `npm run content:photo`.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWishlist, renderCsv, renderMarkdown } from "./lib/photo-wishlist.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const entriesDir = join(root, "content", "entries");
const outDir = join(root, "kit");

const topFlag = process.argv.indexOf("--top");
const top = topFlag === -1 ? 25 : Number.parseInt(process.argv[topFlag + 1], 10);
if (!Number.isInteger(top) || top < 0) {
  console.error("--top needs a whole number, for example --top 40.");
  process.exit(1);
}

const destinations = JSON.parse(readFileSync(join(root, "content", "destinations.json"), "utf8"));
const entries = readdirSync(entriesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(entriesDir, f), "utf8")));

const wishlist = buildWishlist(entries, destinations);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "photo-wishlist.md"), renderMarkdown(wishlist, { top, generated: new Date().toISOString().slice(0, 10) }));
writeFileSync(join(outDir, "photo-wishlist.csv"), renderCsv(wishlist));

const ready = wishlist.ranked.filter((r) => r.readiness === 0).length;
console.log(
  `${wishlist.withPhoto} of ${wishlist.total} finds have a photo. ${wishlist.ranked.length} still need one, ${ready} of them verified and ready to shoot.`
);
console.log("Wrote kit/photo-wishlist.md and kit/photo-wishlist.csv");

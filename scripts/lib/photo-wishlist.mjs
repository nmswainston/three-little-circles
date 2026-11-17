/**
 * Pure logic for the reference-photo wishlist, kept apart from the script so
 * it can be tested without touching the disk.
 *
 * A find needs a photo when it has none and is not marked Removed. Needs are
 * ranked so the most useful shots come first:
 *
 *   1. Readiness. A find someone has already checked in person or by photo is
 *      known to be there, so it can be shot on the spot. Next come finds in
 *      official park material ("Documented"), then community reports, which
 *      need verifying while you are there.
 *   2. Difficulty, hardest first. A reference photo helps most on the finds
 *      guests are least likely to spot unaided.
 *   3. Park, land, attraction, and scene order, so ties read as a walk.
 *
 * The by-park lists keep the same walking order the app uses: lands as listed
 * in destinations.json, attractions by name, and finds from entrance to exit.
 */

const DIFFICULTY_ORDER = ["Hard", "Medium", "Easy"];
const LOCATION_ORDER = ["Outdoor", "Queue", "Pre-show", "Ride", "Indoor"];

/** How ready a find is to be photographed. Lower is more ready. */
export function readiness(entry) {
  if (entry.verification === "In-person" || entry.verification === "Photo") return 0;
  if (entry.verification === "Documented") return 1;
  return 2;
}

export const READINESS_LABEL = ["Verified, ready to shoot", "In official material, verify and shoot", "Community report, verify and shoot"];

export function needsPhoto(entry) {
  return !entry.image && entry.status !== "Removed";
}

function difficultyRank(entry) {
  const index = DIFFICULTY_ORDER.indexOf(entry.difficulty);
  return index === -1 ? DIFFICULTY_ORDER.length : index;
}

const text = (value) => (typeof value === "string" ? value.trim() : "");

/** "Moving, Dim, High crowds": what the shot will be like, from the entry's viewing notes. */
function conditions(viewing) {
  if (!viewing) return "";
  const parts = [viewing.motion, viewing.lighting, viewing.crowding ? `${viewing.crowding} crowds` : undefined];
  return parts.filter(Boolean).join(", ");
}

/** Turns an entry into the plain row the lists show. */
function toRow(entry) {
  const where = entry.whereToLook ?? {};
  return {
    id: entry.id,
    parkId: entry.parkId,
    landId: entry.landId,
    attractionId: entry.attractionId,
    park: text(entry.display?.parkName),
    land: text(entry.display?.landName),
    attraction: text(entry.display?.attractionName),
    title: text(entry.display?.entryTitle) || entry.id,
    difficulty: entry.difficulty,
    locationType: entry.locationType,
    surprise: entry.entryType === "FACT",
    readiness: readiness(entry),
    scene: text(where.scene),
    exactSpot: text(where.exactSpot),
    tip: text(entry.bestTip),
    access: text(entry.accessNotes),
    conditions: conditions(entry.viewing),
    sceneOrder: entry.sceneOrder ?? Infinity,
  };
}

function compareWalk(a, b, parkIndex, landIndex) {
  return (
    parkIndex(a.parkId) - parkIndex(b.parkId) ||
    landIndex(a.parkId, a.landId, a.land) - landIndex(b.parkId, b.landId, b.land) ||
    a.land.localeCompare(b.land) ||
    a.attraction.localeCompare(b.attraction) ||
    (a.sceneOrder === b.sceneOrder ? 0 : a.sceneOrder < b.sceneOrder ? -1 : 1) ||
    LOCATION_ORDER.indexOf(a.locationType) - LOCATION_ORDER.indexOf(b.locationType) ||
    a.title.localeCompare(b.title)
  );
}

/**
 * Splits the entries into the ranked list of needs and the same needs grouped
 * by park in walking order. `destinations` is content/destinations.json.
 */
export function buildWishlist(entries, destinations) {
  const parkOrder = destinations.map((d) => d.parkId);
  const parkIndex = (parkId) => {
    const index = parkOrder.indexOf(parkId);
    return index === -1 ? parkOrder.length : index;
  };
  const landOrders = new Map(destinations.map((d) => [d.parkId, d.landOrder ?? []]));
  const landIndex = (parkId, landId) => {
    const index = (landOrders.get(parkId) ?? []).indexOf(landId);
    return index === -1 ? 999 : index;
  };

  const needs = entries.filter(needsPhoto).map(toRow);
  const ranked = needs
    .slice()
    .sort((a, b) => a.readiness - b.readiness || difficultyRank(a) - difficultyRank(b) || compareWalk(a, b, parkIndex, landIndex))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const parks = [];
  for (const row of ranked.slice().sort((a, b) => compareWalk(a, b, parkIndex, landIndex))) {
    let park = parks.find((p) => p.parkId === row.parkId);
    if (!park) {
      park = { parkId: row.parkId, name: destinations.find((d) => d.parkId === row.parkId)?.name ?? row.park, lands: [] };
      parks.push(park);
    }
    let land = park.lands.find((l) => l.landId === row.landId);
    if (!land) {
      land = { landId: row.landId, name: row.land, attractions: [] };
      park.lands.push(land);
    }
    let attraction = land.attractions.find((a) => a.attractionId === row.attractionId);
    if (!attraction) {
      attraction = { attractionId: row.attractionId, name: row.attraction, entries: [] };
      land.attractions.push(attraction);
    }
    attraction.entries.push(row);
  }

  return { total: entries.length, withPhoto: entries.filter((e) => e.image).length, ranked, parks };
}

const csvCell = (value) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per find, in rank order, with columns left blank for the day. */
export function renderCsv({ ranked }) {
  const header = ["rank", "entry_id", "park", "land", "attraction", "title", "difficulty", "location_type", "readiness", "scene", "exact_spot", "tip", "access", "conditions", "photo_taken", "notes"];
  const lines = [header.join(",")];
  for (const row of ranked) {
    lines.push(
      [
        row.rank,
        row.id,
        row.park,
        row.land,
        row.attraction,
        row.title,
        row.difficulty,
        row.locationType,
        READINESS_LABEL[row.readiness],
        row.scene,
        row.exactSpot,
        row.tip,
        row.access,
        row.conditions,
        "",
        "",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n") + "\n";
}

function renderFind(row, { withPlace }) {
  const tags = [row.difficulty, row.locationType, row.surprise ? "Hidden Surprise" : undefined].filter(Boolean).join(", ");
  const place = withPlace ? ` (${[row.park, row.land, row.attraction].filter(Boolean).join(" > ")})` : "";
  const lines = [`- [ ] **${row.title}** (${tags})${place}`, `  - id: \`${row.id}\``];
  if (row.scene) lines.push(`  - Scene: ${row.scene}`);
  if (row.exactSpot) lines.push(`  - Exact spot: ${row.exactSpot}`);
  if (row.tip) lines.push(`  - Tip: ${row.tip}`);
  if (row.access) lines.push(`  - Access: ${row.access}`);
  if (row.conditions) lines.push(`  - Conditions: ${row.conditions}`);
  return lines.join("\n");
}

/**
 * The wishlist as one markdown page: a summary, the shots that are ready now,
 * the hardest finds to verify and shoot next, then every need by park in
 * walking order.
 */
export function renderMarkdown(result, { top = 25, generated } = {}) {
  const { total, withPhoto, ranked, parks } = result;
  const ready = ranked.filter((r) => r.readiness === 0);
  const next = ranked.filter((r) => r.readiness !== 0).slice(0, top);
  const out = [];

  out.push("# Reference photo wishlist", "");
  if (generated) out.push(`Generated ${generated}. Regenerate with \`npm run content:photo-list\`; this folder is ignored by git.`, "");
  out.push(`${withPhoto} of ${total} finds have a photo. ${ranked.length} still need one.`, "");
  out.push(
    "Ranked by readiness first (finds already checked in person or by photo), then difficulty, hardest first. A reference photo helps most on the finds guests are least likely to spot unaided.",
    ""
  );

  out.push(`## Ready to shoot (${ready.length})`, "");
  out.push(ready.length ? ready.map((r) => renderFind(r, { withPlace: true })).join("\n") : "Nothing verified is waiting on a photo.", "");

  out.push(`## Verify and shoot next (hardest ${next.length})`, "");
  out.push(next.length ? next.map((r) => renderFind(r, { withPlace: true })).join("\n") : "Nothing else needs a photo.", "");

  out.push("## By park, in walking order", "");
  for (const park of parks) {
    const count = park.lands.reduce((s, l) => s + l.attractions.reduce((t, a) => t + a.entries.length, 0), 0);
    out.push(`### ${park.name} (${count})`, "");
    for (const land of park.lands) {
      out.push(`#### ${land.name}`, "");
      for (const attraction of land.attractions) {
        out.push(`**${attraction.name}**`, "");
        out.push(attraction.entries.map((r) => renderFind(r, { withPlace: false })).join("\n"), "");
      }
    }
  }

  out.push(
    "## Adding a photo",
    "",
    "```bash",
    'npm run content:photo -- <entry-id> photo.jpg --alt "What the photo shows" --credit "Your name"',
    "```",
    "",
    "Your own photo, cropped to the detail rather than the attraction around it. No character art, logos, or anything lifted from a park map or website. See content/images/README.md for the rules.",
    ""
  );
  return out.join("\n");
}

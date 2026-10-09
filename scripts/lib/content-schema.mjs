/**
 * The shape of the content files: which keys each object may have, in the
 * order they are written. scripts/build-entries.mjs validates against these
 * lists and scripts/format-entries.mjs rewrites files to match them, so the
 * two can never disagree.
 *
 * The order matters only to people. When every file puts the same key in the
 * same place, a diff shows what changed instead of what moved, and a reader
 * finds "status" where the last file had it.
 */

export const ENTRY_KEYS = [
  "id", "parkId", "landId", "attractionId", "display", "entryType",
  "locationType", "difficulty", "areaContext", "description", "whereToLook",
  "bestTip", "funFacts", "viewing", "confidence", "verification", "verifiedAtISO",
  "status", "accessNotes", "coordinates", "image", "sourceId", "sourceUrl",
  "createdAtISO", "updatedAtISO",
];

/** The find's own title first, then where it sits. */
export const DISPLAY_KEYS = ["entryTitle", "parkName", "landName", "attractionName"];
export const WHERE_TO_LOOK_KEYS = ["scene", "exactSpot", "orientation"];
export const VIEWING_KEYS = ["motion", "lighting", "angle", "crowding", "distance", "notes"];
export const COORDINATE_KEYS = ["latitude", "longitude"];
export const IMAGE_KEYS = ["file", "alt", "credit"];

/** Objects inside an entry with an order of their own. Arrays (funFacts) are left as written. */
export const ENTRY_NESTED = {
  display: DISPLAY_KEYS,
  whereToLook: WHERE_TO_LOOK_KEYS,
  viewing: VIEWING_KEYS,
  coordinates: COORDINATE_KEYS,
  image: IMAGE_KEYS,
};

export const FACT_KEYS = ["id", "parkId", "region", "landId", "attractionId", "title", "body", "createdAtISO", "updatedAtISO"];

/** Each target is a one-key object, so targets need no order of their own. */
export const CHALLENGE_KEYS = [
  "id", "title", "blurb", "parkId", "icon", "goal", "count", "targets", "createdAtISO", "updatedAtISO",
];

/**
 * The first known key that comes too early, with the key it should precede, or
 * undefined when the known keys are in order. Unknown keys are skipped here;
 * the build reports those on their own.
 */
export function firstOutOfOrder(obj, order) {
  const keys = Object.keys(obj).filter((key) => order.includes(key));
  for (let i = 1; i < keys.length; i++) {
    if (order.indexOf(keys[i]) < order.indexOf(keys[i - 1])) return { key: keys[i], before: keys[i - 1] };
  }
  return undefined;
}

/**
 * A copy of obj with the known keys in canonical order, then anything unknown
 * in the order it was written, so the build can still name it. Nested objects
 * listed in `nested` are ordered the same way; values are never changed.
 */
export function orderKeys(obj, order, nested = {}) {
  // A null prototype, so a stray "__proto__" key is copied like any other
  // instead of reaching the setter and vanishing before the build can name it.
  const out = Object.create(null);
  for (const key of order) {
    if (!Object.hasOwn(obj, key)) continue;
    const value = obj[key];
    const inner = nested[key];
    out[key] = inner && isPlainObject(value) ? orderKeys(value, inner) : value;
  }
  for (const key of Object.keys(obj)) if (!Object.hasOwn(out, key)) out[key] = obj[key];
  return out;
}

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

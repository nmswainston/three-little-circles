/**
 * The pure parts of scripts/import-submissions.mjs, kept apart so they can be
 * tested without a Supabase project: what a row becomes and what it is called.
 */

export const slugify = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";

/** A photo of a find already in the guide, as opposed to a new find. */
export function isPhotoSubmission(row) {
  return typeof row.for_entry_id === "string" && row.for_entry_id.trim().length > 0;
}

/** The draft entry a new-find submission becomes, TODO markers and all. */
export function draftFor(row, id, now) {
  return {
    id,
    parkId: row.park_id,
    landId: `TODO-${slugify(row.land_name || "land")}`,
    attractionId: slugify(row.attraction_name),
    display: {
      entryTitle: row.title,
      parkName: row.park_name,
      landName: row.land_name || "TODO",
      attractionName: row.attraction_name,
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
}

/**
 * Where a photo lands under content/inbox/photos: the entry it is for plus the
 * start of the row id, with the bucket file's extension when it has a sane one.
 */
export function photoFileName(row) {
  const name = String(row.photo_path ?? "").split("?")[0];
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  const safe = /^[a-z0-9]{2,5}$/.test(ext) ? ext : "jpg";
  return `${slugify(row.for_entry_id)}-${String(row.id).replace(/[^a-z0-9]/gi, "").slice(0, 8)}.${safe}`;
}

/**
 * The content:photo command that wires the saved file into its entry. The alt
 * text stays a TODO: only a person can say what the photo shows.
 */
export function photoCommand(row, relativeFile) {
  const quote = (value) => `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
  const parts = ["npm run content:photo --", row.for_entry_id, relativeFile, "--alt", quote("TODO what the photo shows")];
  if (row.credit_ok && row.contact_name) parts.push("--credit", quote(row.contact_name));
  return parts.join(" ");
}

import { EntryStatus, HiddenMickeyEntry } from "./types";

/**
 * Chip text for a status worth warning about. Current needs no chip.
 * Unverified reads as "Unconfirmed" because guests do not care how it was
 * researched, only that nobody has checked it in person yet.
 */
export const STATUS_LABEL: Record<EntryStatus, string | null> = {
  Current: null,
  Unverified: "Unconfirmed",
  Seasonal: "Seasonal",
  Variable: "Props move",
  Removed: "Removed",
  Lead: "Lead",
};

/**
 * Whether a guest can go and find this today. Leads (a report nobody has
 * pinned down) and removed finds stay in the guide for context but are left
 * out of every total, ring, and badge, and the detail screen offers a
 * sighting report instead of the Found button.
 */
export function countsTowardProgress(entry: Pick<HiddenMickeyEntry, "status">): boolean {
  return entry.status !== "Lead" && entry.status !== "Removed";
}

/**
 * Chip text for list rows. Only the statuses that change what a row promises
 * are flagged there; the detail screen shows the rest.
 */
export function listStatusLabel(entry: Pick<HiddenMickeyEntry, "status">): string | null {
  if (!entry.status || countsTowardProgress(entry)) return null;
  return STATUS_LABEL[entry.status];
}

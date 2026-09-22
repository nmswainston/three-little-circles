import { relativeTime } from "../lib/time";
import { confirmations, CONFIRMATIONS_PULLED_AT_ISO } from "./confirmations.generated";

/**
 * "Still there?" freshness, one summary per entry, baked in at build time by
 * scripts/pull-confirmations.mjs. The app never reads the table directly, so
 * it stays offline and the anon key stays insert-only.
 */
export type ConfirmationSummary = {
  /** Devices whose latest report in the window said they saw it. */
  seen: number;
  /** Devices whose latest report in the window said they couldn't find it. */
  missing: number;
  /** Most recent "saw it today" among those latest reports. */
  lastSeenISO?: string;
  /** Most recent "couldn't find it" among those latest reports. */
  lastMissingISO?: string;
};

export function getConfirmation(entryId: string): ConfirmationSummary | undefined {
  return confirmations[entryId];
}

/** When the bundled summaries were pulled, or undefined before the first pull. */
export const confirmationsPulledAtISO: string | undefined = CONFIRMATIONS_PULLED_AT_ISO;

export type Freshness = {
  /** "Last seen 3 weeks ago", "Reported missing yesterday", or "No reports yet". */
  label: string;
  /** How many said each, when there is anything to count. */
  detail?: string;
  /** True when the most recent word is that it's gone. */
  warning: boolean;
};

const parse = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * Turns a summary into what the entry screen says. The most recent report
 * decides the headline; the counts ride along so one "couldn't find it"
 * after ten sightings reads as what it is.
 */
export function describeFreshness(summary: ConfirmationSummary | undefined, now: number = Date.now()): Freshness {
  const seenAt = parse(summary?.lastSeenISO);
  const missingAt = parse(summary?.lastMissingISO);
  if (!summary || (seenAt === undefined && missingAt === undefined)) {
    return { label: "No reports yet", warning: false };
  }

  const parts: string[] = [];
  if (summary.seen > 0) parts.push(`${summary.seen} saw it`);
  if (summary.missing > 0) parts.push(`${summary.missing} couldn't find it`);
  const detail = parts.length > 0 ? parts.join(" · ") : undefined;

  if (missingAt !== undefined && (seenAt === undefined || missingAt > seenAt)) {
    return { label: `Reported missing ${relativeTime(missingAt, now)}`, detail, warning: true };
  }
  return { label: `Last seen ${relativeTime(seenAt as number, now)}`, detail, warning: false };
}

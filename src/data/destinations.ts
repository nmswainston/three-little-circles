import { entries } from "./entries";
import { labelOrFallback } from "./labels";
import { ParkKey } from "../theme/themes";
import destinationsJson from "../../content/destinations.json";

/**
 * Destinations the app knows about, grouped by region, in display order.
 *
 * Entries reference a destination by parkId. The list lives in
 * content/destinations.json so the app and the content scripts share it. It
 * adds the region, the accent palette, and a stable display name, and lets
 * the Parks screen show destinations that have no entries yet as "Coming
 * soon". Add a row there when content for a new park starts landing.
 */
export type Region = "Florida" | "California" | "Paris" | "Tokyo" | "Hong Kong" | "Shanghai";

export const REGIONS: Region[] = ["Florida", "California", "Paris", "Tokyo", "Hong Kong", "Shanghai"];

export type Destination = {
  parkId: string;
  name: string;
  region: Region;
  parkKey: ParkKey;
};

export const DESTINATIONS: Destination[] = destinationsJson as Destination[];

const BY_ID: Record<string, Destination> = Object.fromEntries(DESTINATIONS.map((d) => [d.parkId, d]));

export function getDestination(parkId: string): Destination | undefined {
  return BY_ID[parkId];
}

/**
 * True for a theme park, false for a catch-all area such as the resorts or
 * the shopping district. Those areas use a `_bucket` id suffix by convention
 * (see content/README.md), which is what this checks.
 */
export function isThemePark(parkId: string): boolean {
  return !parkId.endsWith("_bucket");
}

export type DestinationSummary = Destination & {
  /** Number of entries documented for this destination. 0 means "coming soon". */
  count: number;
};

/**
 * Every known destination with its entry count, plus any destination that
 * appears in the content but is not listed above (so nothing is ever hidden).
 * Unlisted destinations are placed in Florida with the kingdom accent; add
 * them to DESTINATIONS to give them a proper region and accent.
 */
export function getDestinationSummaries(): DestinationSummary[] {
  const counts = new Map<string, number>();
  const namesFromContent = new Map<string, string>();
  for (const entry of entries) {
    counts.set(entry.parkId, (counts.get(entry.parkId) ?? 0) + 1);
    if (!namesFromContent.has(entry.parkId)) {
      namesFromContent.set(entry.parkId, labelOrFallback(entry.display?.parkName, entry.parkId));
    }
  }

  const listed = DESTINATIONS.map((d) => ({ ...d, count: counts.get(d.parkId) ?? 0 }));

  const unlisted: DestinationSummary[] = [];
  for (const [parkId, count] of counts) {
    if (!BY_ID[parkId]) {
      unlisted.push({
        parkId,
        name: namesFromContent.get(parkId) ?? parkId,
        region: "Florida",
        parkKey: "kingdom",
        count,
      });
    }
  }

  return [...listed, ...unlisted];
}

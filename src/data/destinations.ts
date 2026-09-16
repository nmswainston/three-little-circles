import { entries } from "./entries";
import { RESORTS_BUCKET_ID } from "./constants";
import { labelOrFallback } from "./labels";
import { ParkKey } from "../theme/themes";

/**
 * Destinations the app knows about, grouped by region, in display order.
 *
 * Entries reference a destination by parkId. This list adds the region, the
 * accent palette, and a stable display name, and lets the Parks screen show
 * destinations that have no entries yet as "Coming soon". Add a row here when
 * content for a new park starts landing.
 */
export type Region = "Florida" | "California" | "Paris" | "Tokyo" | "Hong Kong" | "Shanghai";

export const REGIONS: Region[] = ["Florida", "California", "Paris", "Tokyo", "Hong Kong", "Shanghai"];

export type Destination = {
  parkId: string;
  name: string;
  region: Region;
  parkKey: ParkKey;
};

export const DESTINATIONS: Destination[] = [
  { parkId: "magic_kingdom_park", name: "Kingdom Park", region: "Florida", parkKey: "kingdom" },
  { parkId: "studios_park", name: "Studios Park", region: "Florida", parkKey: "studios" },
  { parkId: "showcase_park", name: "Showcase Park", region: "Florida", parkKey: "showcase" },
  { parkId: "adventure_park", name: "Adventure Park", region: "Florida", parkKey: "adventure" },
  { parkId: "springs_bucket", name: "Springs", region: "Florida", parkKey: "springs" },
  { parkId: RESORTS_BUCKET_ID, name: "Resorts", region: "Florida", parkKey: "resorts" },

  { parkId: "california_kingdom_park", name: "Kingdom Park", region: "California", parkKey: "kingdom" },
  { parkId: "california_pier_park", name: "Pier Park", region: "California", parkKey: "adventure" },

  { parkId: "paris_kingdom_park", name: "Kingdom Park", region: "Paris", parkKey: "kingdom" },
  { parkId: "paris_studios_park", name: "Studios Park", region: "Paris", parkKey: "studios" },

  { parkId: "tokyo_kingdom_park", name: "Kingdom Park", region: "Tokyo", parkKey: "kingdom" },
  { parkId: "tokyo_sea_park", name: "Sea Park", region: "Tokyo", parkKey: "springs" },

  { parkId: "hong_kong_kingdom_park", name: "Kingdom Park", region: "Hong Kong", parkKey: "kingdom" },

  { parkId: "shanghai_kingdom_park", name: "Kingdom Park", region: "Shanghai", parkKey: "kingdom" },
];

const BY_ID: Record<string, Destination> = Object.fromEntries(DESTINATIONS.map((d) => [d.parkId, d]));

export function getDestination(parkId: string): Destination | undefined {
  return BY_ID[parkId];
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

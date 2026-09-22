import { entries } from "./entries";
import { HiddenMickeyEntry, ParkId, LandId, AttractionId } from "./types";
import { labelOrFallback } from "./labels";
import { SegmentedControlOption } from "../components/ui/SegmentedControl";

export function getAllEntries(): HiddenMickeyEntry[] {
  return entries;
}

export function getEntryById(id: string): HiddenMickeyEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

/** True when the entry passes the All / Finds / Facts filter. No filter means everything. */
export function matchesEntryType(entry: HiddenMickeyEntry, filter?: SegmentedControlOption): boolean {
  if (!filter || filter === "All") return true;
  return entry.entryType === filter;
}

export type ParkSummary = {
  parkId: ParkId;
  parkName: string;
  count: number;
};

export function getParksSummary(entryTypeFilter?: SegmentedControlOption): ParkSummary[] {
  const parkMap = new Map<ParkId, { count: number; parkName: string }>();

  entries
    .filter((entry) => matchesEntryType(entry, entryTypeFilter))
    .forEach((entry) => {
      const existing = parkMap.get(entry.parkId);
      const parkName = labelOrFallback(entry.display?.parkName, "Park");
      if (existing) {
        existing.count++;
      } else {
        parkMap.set(entry.parkId, { count: 1, parkName });
      }
    });

  return Array.from(parkMap.entries()).map(([parkId, { count, parkName }]) => ({
    parkId,
    parkName,
    count,
  }));
}

export type LandSummary = {
  landId: LandId;
  landName: string;
  count: number;
};

export function getLandsByPark(
  parkId: ParkId,
  entryTypeFilter?: SegmentedControlOption
): LandSummary[] {
  const landMap = new Map<LandId, { count: number; landName: string }>();

  entries
    .filter((entry) => entry.parkId === parkId && matchesEntryType(entry, entryTypeFilter))
    .forEach((entry) => {
      const existing = landMap.get(entry.landId);
      const landName = labelOrFallback(entry.display?.landName, "Land");
      if (existing) {
        existing.count++;
      } else {
        landMap.set(entry.landId, { count: 1, landName });
      }
    });

  return Array.from(landMap.entries()).map(([landId, { count, landName }]) => ({
    landId,
    landName,
    count,
  }));
}

export type AttractionSummary = {
  attractionId: AttractionId;
  attractionName: string;
  count: number;
};

export function getAttractionsByLand(
  parkId: ParkId,
  landId: LandId,
  entryTypeFilter?: SegmentedControlOption
): AttractionSummary[] {
  const attractionMap = new Map<
    AttractionId,
    { count: number; attractionName: string }
  >();

  entries
    .filter(
      (entry) =>
        entry.parkId === parkId && entry.landId === landId && matchesEntryType(entry, entryTypeFilter)
    )
    .forEach((entry) => {
      const existing = attractionMap.get(entry.attractionId);
      const attractionName = labelOrFallback(
        entry.display?.attractionName,
        "Attraction"
      );
      if (existing) {
        existing.count++;
      } else {
        attractionMap.set(entry.attractionId, { count: 1, attractionName });
      }
    });

  return Array.from(attractionMap.entries()).map(
    ([attractionId, { count, attractionName }]) => ({
      attractionId,
      attractionName,
      count,
    })
  );
}

export function getEntriesByAttraction(
  parkId: ParkId,
  landId: LandId,
  attractionId: AttractionId,
  entryTypeFilter?: SegmentedControlOption
): HiddenMickeyEntry[] {
  return entries.filter(
    (entry) =>
      entry.parkId === parkId &&
      entry.landId === landId &&
      entry.attractionId === attractionId &&
      matchesEntryType(entry, entryTypeFilter)
  );
}

export type AttractionGroup = AttractionSummary & { entries: HiddenMickeyEntry[] };
export type LandGroup = LandSummary & { attractions: AttractionGroup[] };

/**
 * Groups a flat list of entries into lands, then attractions, in the order
 * they first appear. Counts describe the list given, so a filtered list
 * yields filtered counts and any land or attraction with nothing left simply
 * isn't returned. Pass one park's entries; lands are keyed within a park.
 */
export function groupByLand(list: HiddenMickeyEntry[]): LandGroup[] {
  const lands = new Map<string, LandGroup>();

  for (const entry of list) {
    const landKey = `${entry.parkId}/${entry.landId}`;
    let land = lands.get(landKey);
    if (!land) {
      land = {
        landId: entry.landId,
        landName: labelOrFallback(entry.display?.landName, "Land"),
        count: 0,
        attractions: [],
      };
      lands.set(landKey, land);
    }
    land.count++;

    let attraction = land.attractions.find((a) => a.attractionId === entry.attractionId);
    if (!attraction) {
      attraction = {
        attractionId: entry.attractionId,
        attractionName: labelOrFallback(entry.display?.attractionName, "Attraction"),
        count: 0,
        entries: [],
      };
      land.attractions.push(attraction);
    }
    attraction.count++;
    attraction.entries.push(entry);
  }

  return Array.from(lands.values());
}

/** The other entries at the same attraction as this one, in content order. */
export function getRelatedEntries(entry: HiddenMickeyEntry): HiddenMickeyEntry[] {
  return entries.filter(
    (other) =>
      other.id !== entry.id &&
      other.parkId === entry.parkId &&
      other.landId === entry.landId &&
      other.attractionId === entry.attractionId
  );
}

export function formatSubtitle(entry: HiddenMickeyEntry): string {
  return `${entry.locationType} • ${entry.difficulty}`;
}

/**
 * Case-insensitive search across an entry's title, attraction, land, park,
 * and description. Every whitespace-separated term must match somewhere.
 */
export function searchEntries(query: string): HiddenMickeyEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return entries.filter((entry) => {
    const haystack = [
      entry.display?.entryTitle,
      entry.display?.attractionName,
      entry.display?.landName,
      entry.display?.parkName,
      entry.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

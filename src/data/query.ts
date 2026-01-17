import { entries } from "./entries";
import { HiddenMickeyEntry, ParkId, LandId, AttractionId, EntryType } from "./types";
import { labelOrFallback } from "./labels";
import { SegmentedControlOption } from "../components/ui/SegmentedControl";

export function getAllEntries(): HiddenMickeyEntry[] {
  return entries;
}

export function getEntryById(id: string): HiddenMickeyEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export type ParkSummary = {
  parkId: ParkId;
  parkName: string;
  count: number;
};

export function getParksSummary(entryTypeFilter?: SegmentedControlOption): ParkSummary[] {
  const parkMap = new Map<ParkId, { count: number; parkName: string }>();

  entries
    .filter((entry) => {
      if (!entryTypeFilter || entryTypeFilter === 'All') return true;
      return entry.entryType === entryTypeFilter;
    })
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
    .filter((entry) => {
      if (entry.parkId !== parkId) return false;
      if (!entryTypeFilter || entryTypeFilter === 'All') return true;
      return entry.entryType === entryTypeFilter;
    })
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
    .filter((entry) => {
      if (entry.parkId !== parkId || entry.landId !== landId) return false;
      if (!entryTypeFilter || entryTypeFilter === 'All') return true;
      return entry.entryType === entryTypeFilter;
    })
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
    (entry) => {
      if (
        entry.parkId !== parkId ||
        entry.landId !== landId ||
        entry.attractionId !== attractionId
      ) {
        return false;
      }
      if (!entryTypeFilter || entryTypeFilter === 'All') return true;
      return entry.entryType === entryTypeFilter;
    }
  );
}

export function formatSubtitle(entry: HiddenMickeyEntry): string {
  return `${entry.locationType} • ${entry.difficulty}`;
}

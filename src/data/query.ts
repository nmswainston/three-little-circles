import { entries } from "./entries";
import { HiddenMickeyEntry, ParkId, LandId, AttractionId } from "./types";
import { labelOrFallback } from "./labels";
import { isConfirmed } from "./confirmations";
import { DESTINATIONS, getLandRank } from "./destinations";
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

const DESTINATION_INDEX = new Map(DESTINATIONS.map((d, i) => [d.parkId, i]));

/**
 * Lands in the order you walk them: by park as the Parks screen lists them,
 * then by the destination's landOrder (clockwise from the gate), then
 * alphabetically for any land the destination does not list.
 */
export function orderLands<T extends { parkId?: ParkId; landId: LandId; landName: string }>(
  parkId: ParkId,
  lands: T[]
): T[] {
  return [...lands].sort((a, b) => {
    const parkA = DESTINATION_INDEX.get(a.parkId ?? parkId) ?? Infinity;
    const parkB = DESTINATION_INDEX.get(b.parkId ?? parkId) ?? Infinity;
    if (parkA !== parkB) return parkA < parkB ? -1 : 1;
    const rankA = getLandRank(a.parkId ?? parkId, a.landId);
    const rankB = getLandRank(b.parkId ?? parkId, b.landId);
    if (rankA !== rankB) return rankA < rankB ? -1 : 1;
    return a.landName.localeCompare(b.landName);
  });
}

/** Attractions have no walking order inside a land, so they go alphabetically. */
export function orderAttractions<T extends { attractionName: string }>(attractions: T[]): T[] {
  return [...attractions].sort((a, b) => a.attractionName.localeCompare(b.attractionName));
}

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

  return orderLands(
    parkId,
    Array.from(landMap.entries()).map(([landId, { count, landName }]) => ({
      landId,
      landName,
      count,
    }))
  );
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

  return orderAttractions(
    Array.from(attractionMap.entries()).map(([attractionId, { count, attractionName }]) => ({
      attractionId,
      attractionName,
      count,
    }))
  );
}

export function getEntriesByAttraction(
  parkId: ParkId,
  landId: LandId,
  attractionId: AttractionId,
  entryTypeFilter?: SegmentedControlOption
): HiddenMickeyEntry[] {
  return walkOrder(
    entries.filter(
      (entry) =>
        entry.parkId === parkId &&
        entry.landId === landId &&
        entry.attractionId === attractionId &&
        matchesEntryType(entry, entryTypeFilter)
    )
  );
}

/**
 * The parts of an attraction in the order a guest meets them: the way in,
 * the lobby (on a ride, the first room of the wait), the queue, boarding,
 * the ride, and the way out. Shops and displays come last because they are
 * usually what you pass on the way to the next thing.
 */
const WALK_AREA_ORDER: Record<NonNullable<HiddenMickeyEntry["areaContext"]>, number> = {
  Entrance: 0,
  Lobby: 1,
  Queue: 2,
  Loading: 3,
  Dock: 4,
  Ride: 5,
  "Post-show": 6,
  Exit: 7,
  Walkway: 8,
  "Outdoor Display": 9,
  Shop: 10,
};

/**
 * Where an entry without an area context slots into that walk. A pre-show
 * with no area named sits with the lobby, since the rides that leave it
 * unset hold their pre-show in the first room.
 */
const WALK_LOCATION_AREA: Record<HiddenMickeyEntry["locationType"], number> = {
  Outdoor: WALK_AREA_ORDER.Entrance,
  Queue: WALK_AREA_ORDER.Queue,
  "Pre-show": WALK_AREA_ORDER.Lobby,
  Ride: WALK_AREA_ORDER.Ride,
  Indoor: WALK_AREA_ORDER.Lobby,
};

/** Within one area, the pre-show comes before the ride and outdoor finds before indoor ones. */
const WALK_LOCATION_ORDER: Record<HiddenMickeyEntry["locationType"], number> = {
  Outdoor: 0,
  Queue: 1,
  "Pre-show": 2,
  Ride: 3,
  Indoor: 4,
};

function walkRank(entry: HiddenMickeyEntry): number {
  const area = entry.areaContext ? WALK_AREA_ORDER[entry.areaContext] : WALK_LOCATION_AREA[entry.locationType];
  // Area first, then location type within it. Scene order and confirmation
  // break ties below, in walkOrder.
  return area * 10 + WALK_LOCATION_ORDER[entry.locationType];
}

/**
 * The same list in the order you would meet the finds on a visit: entrance,
 * queue, boarding, ride, exit, then the shop. Within an area, finds with a
 * sceneOrder come first in that order, so a ride's scenes run from the first
 * room to the last; finds without one follow, confirmed ones ahead of
 * unconfirmed. The sort is stable, so remaining ties keep their content order.
 */
export function walkOrder<T extends HiddenMickeyEntry>(list: T[]): T[] {
  return list
    .map((entry, index) => ({
      entry,
      index,
      rank: walkRank(entry),
      scene: entry.sceneOrder ?? Infinity,
      unconfirmed: isConfirmed(entry) ? 0 : 1,
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.scene === b.scene ? 0 : a.scene < b.scene ? -1 : 1) ||
        a.unconfirmed - b.unconfirmed ||
        a.index - b.index
    )
    .map((item) => item.entry);
}

export type AttractionGroup = AttractionSummary & { entries: HiddenMickeyEntry[] };
export type LandGroup = LandSummary & { attractions: AttractionGroup[] };

/**
 * Groups a flat list of entries into lands, then attractions, in the order
 * they first appear, with each attraction's finds in walk order. Counts
 * describe the list given, so a filtered list yields filtered counts and any
 * land or attraction with nothing left simply isn't returned. Pass one
 * park's entries; lands are keyed within a park.
 */
export function groupByLand(list: HiddenMickeyEntry[]): LandGroup[] {
  const lands = new Map<string, LandGroup & { parkId: ParkId }>();

  for (const entry of list) {
    const landKey = `${entry.parkId}/${entry.landId}`;
    let land = lands.get(landKey);
    if (!land) {
      land = {
        parkId: entry.parkId,
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

  // Lands in walking order, attractions by name, and each attraction's finds
  // from entrance to exit. The list usually holds one park; when it holds
  // several, parks keep the order of the Parks screen.
  const firstPark = list[0]?.parkId ?? "";
  return orderLands(firstPark, Array.from(lands.values())).map(({ parkId: _parkId, ...land }) => ({
    ...land,
    attractions: orderAttractions(land.attractions).map((attraction) => ({
      ...attraction,
      entries: walkOrder(attraction.entries),
    })),
  }));
}

/**
 * The same list with confirmed finds ahead of unconfirmed ones. The sort is
 * stable, so each half keeps its content order.
 */
export function confirmedFirst<T extends HiddenMickeyEntry>(list: T[]): T[] {
  const confirmed: T[] = [];
  const rest: T[] = [];
  for (const entry of list) (isConfirmed(entry) ? confirmed : rest).push(entry);
  return confirmed.concat(rest);
}

/** The other entries at the same attraction as this one, in walk order. */
export function getRelatedEntries(entry: HiddenMickeyEntry): HiddenMickeyEntry[] {
  return walkOrder(
    entries.filter(
      (other) =>
        other.id !== entry.id &&
        other.parkId === entry.parkId &&
        other.landId === entry.landId &&
        other.attractionId === entry.attractionId
    )
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

import { getEntryById, groupByLand, LandGroup } from '../data/query';
import { getDestination, getDestinationSummaries } from '../data/destinations';
import { labelOrFallback } from '../data/labels';
import { HiddenMickeyEntry } from '../data/types';

export interface TodayPark {
  parkId: string;
  parkName: string;
  lands: LandGroup[];
}

export interface TodaysList {
  parks: TodayPark[];
  total: number;
  found: number;
  /** Ids of the finds on the list that are marked found. */
  foundIds: string[];
}

/**
 * Turns the saved ids into what the screen shows: parks in the order of the
 * Parks screen, then each park's lands in walking order, attractions by name,
 * and finds from entrance to exit. An id whose entry no longer exists is
 * dropped quietly, since content updates can retire a find.
 */
export function describeTodaysList(ids: string[], found: Record<string, number>): TodaysList {
  const entries = ids.map((id) => getEntryById(id)).filter((e): e is HiddenMickeyEntry => e !== undefined);

  const byPark = new Map<string, HiddenMickeyEntry[]>();
  for (const entry of entries) byPark.set(entry.parkId, [...(byPark.get(entry.parkId) ?? []), entry]);

  const parkOrder = getDestinationSummaries().map((d) => d.parkId);
  const rank = (parkId: string) => {
    const index = parkOrder.indexOf(parkId);
    return index === -1 ? parkOrder.length : index;
  };

  const parks = Array.from(byPark.entries())
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([parkId, list]) => ({
      parkId,
      parkName: labelOrFallback(getDestination(parkId)?.name, 'Park'),
      lands: groupByLand(list),
    }));

  const foundIds = entries.filter((e) => e.id in found).map((e) => e.id);
  return { parks, total: entries.length, found: foundIds.length, foundIds };
}

/** "3 of 8 found", or "All 8 found" once the list is done. */
export function todaysProgressLabel(list: Pick<TodaysList, 'total' | 'found'>): string {
  if (list.total > 0 && list.found === list.total) return `All ${list.total} found`;
  return `${list.found} of ${list.total} found`;
}

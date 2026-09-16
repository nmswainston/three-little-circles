import { HiddenMickeyEntry } from "../data/types";

export type ProgressStats = {
  total: number;
  found: number;
};

export type ProgressGroup = ProgressStats & {
  key: string;
  name: string;
  pct: number;
};

export type IsFound = (entryId: string) => boolean;

export function summarize(entries: HiddenMickeyEntry[], isFound: IsFound): ProgressStats {
  let found = 0;
  for (const entry of entries) {
    if (isFound(entry.id)) found += 1;
  }
  return { total: entries.length, found };
}

export function percent(stats: ProgressStats): number {
  return stats.total > 0 ? (stats.found / stats.total) * 100 : 0;
}

export function isComplete(stats: ProgressStats): boolean {
  return stats.total > 0 && stats.found === stats.total;
}

/**
 * Groups entries by a key and counts how many in each group are found.
 * Entries for which getKey returns undefined are skipped.
 */
export function groupProgress(
  entries: HiddenMickeyEntry[],
  isFound: IsFound,
  getKey: (entry: HiddenMickeyEntry) => { key: string; name: string } | undefined
): ProgressGroup[] {
  const map = new Map<string, ProgressGroup>();

  for (const entry of entries) {
    const group = getKey(entry);
    if (!group) continue;

    const cur = map.get(group.key) ?? { key: group.key, name: group.name, total: 0, found: 0, pct: 0 };
    cur.total += 1;
    if (isFound(entry.id)) cur.found += 1;
    map.set(group.key, cur);
  }

  return Array.from(map.values()).map((g) => ({ ...g, pct: percent(g) }));
}

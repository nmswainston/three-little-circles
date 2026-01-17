import { Location } from '../types/models';

export type ProgressStats = {
  total: number;
  found: number;
};

export function groupProgress(
  locations: Location[],
  isFound: (id: string) => boolean,
  getKey: (loc: Location) => string | undefined
): Map<string, ProgressStats> {
  const map = new Map<string, ProgressStats>();

  for (const loc of locations) {
    const key = getKey(loc);
    if (!key) continue;

    const cur = map.get(key) ?? { total: 0, found: 0 };
    cur.total += 1;
    if (isFound(loc.id)) cur.found += 1;
    map.set(key, cur);
  }

  return map;
}

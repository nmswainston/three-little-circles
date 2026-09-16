import { getDestination } from '../data/destinations';
import { ParkKey } from './themes';

/**
 * Maps a parkId from the content to one of the six park accent palettes.
 *
 * Listed destinations carry their own accent. Anything else falls back to
 * keyword matching so that a new parkId picks up a sensible accent without a
 * code change. Unknown ids get the kingdom accent.
 */
const PATTERNS: Array<[RegExp, ParkKey]> = [
  [/kingdom/, 'kingdom'],
  [/studio/, 'studios'],
  [/showcase|world/, 'showcase'],
  [/adventure|animal|nature|pier/, 'adventure'],
  [/spring|village|downtown|district|sea/, 'springs'],
  [/resort|hotel|lodge/, 'resorts'],
];

export function parkKeyFor(parkId: string | undefined): ParkKey {
  if (!parkId) return 'kingdom';
  const listed = getDestination(parkId);
  if (listed) return listed.parkKey;
  const id = parkId.toLowerCase();
  for (const [pattern, key] of PATTERNS) {
    if (pattern.test(id)) return key;
  }
  return 'kingdom';
}

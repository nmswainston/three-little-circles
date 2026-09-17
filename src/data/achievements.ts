import { entries } from "./entries";
import { getDestinationSummaries } from "./destinations";
import { groupProgress, isComplete } from "../utils/progress";
import { ParkKey } from "../theme/themes";
import { PARK_ICONS } from "../theme/parks";

/**
 * Achievement catalog and the pure rules for earning them.
 *
 * Two kinds: fixed milestones (count tiers, one land, one attraction) and one
 * completion badge per destination that has content. Ids are stable strings
 * because they are persisted on the device.
 */
export type AchievementId = string;

export interface Achievement {
  id: AchievementId;
  title: string;
  /** Shown once earned */
  description: string;
  /** How to earn it, shown while locked */
  hint: string;
  /** Ionicons glyph name */
  icon: string;
  /** Set on per-park badges */
  parkId?: string;
  parkKey?: ParkKey;
}

type CountTier = Achievement & { threshold: number };

const COUNT_TIERS: CountTier[] = [
  {
    id: "FIRST_FIND",
    threshold: 1,
    title: "First Find",
    description: "You spotted your very first hidden detail.",
    hint: "Mark any find as found.",
    icon: "star",
  },
  {
    id: "TEN_FINDS",
    threshold: 10,
    title: "Explorer",
    description: "Ten hidden details found.",
    hint: "Find 10 hidden details across any parks.",
    icon: "map",
  },
  {
    id: "TWENTY_FIVE_FINDS",
    threshold: 25,
    title: "Adventurer",
    description: "Twenty-five hidden details found.",
    hint: "Find 25 hidden details across any parks.",
    icon: "compass",
  },
  {
    id: "FIFTY_FINDS",
    threshold: 50,
    title: "Legend",
    description: "Fifty hidden details found.",
    hint: "Find 50 hidden details across any parks.",
    icon: "trophy",
  },
];

const GROUP_BADGES: Achievement[] = [
  {
    id: "LAND_COMPLETE",
    title: "Land Specialist",
    description: "You found everything documented in one land.",
    hint: "Find every documented detail in a single land or resort.",
    icon: "leaf",
  },
  {
    id: "ATTRACTION_COMPLETE",
    title: "Attraction Master",
    description: "You found everything documented at one attraction.",
    hint: "Find every documented detail at a single attraction.",
    icon: "film",
  },
];

export function parkAchievementId(parkId: string): AchievementId {
  return `park:${parkId}`;
}

/** Every achievement in display order: milestones first, then one per park with content. */
export function getAchievements(): Achievement[] {
  const parks = getDestinationSummaries().filter((d) => d.count > 0);

  // Disambiguate parks that share a name across regions.
  const nameCounts = new Map<string, number>();
  for (const park of parks) nameCounts.set(park.name, (nameCounts.get(park.name) ?? 0) + 1);

  const parkBadges: Achievement[] = parks.map((park) => {
    const name = (nameCounts.get(park.name) ?? 0) > 1 ? `${park.name} (${park.region})` : park.name;
    return {
      id: parkAchievementId(park.parkId),
      title: name,
      description: `You found every documented detail in ${name}.`,
      hint: `Find all ${park.count} documented details in ${name}.`,
      icon: PARK_ICONS[park.parkKey],
      parkId: park.parkId,
      parkKey: park.parkKey,
    };
  });

  const tiers: Achievement[] = COUNT_TIERS.map(({ threshold: _threshold, ...rest }) => rest);
  return [...tiers, ...GROUP_BADGES, ...parkBadges];
}

export function getAchievement(id: AchievementId): Achievement | undefined {
  return getAchievements().find((a) => a.id === id);
}

/** Pure: which achievements the given found map satisfies. */
export function computeUnlocked(found: Record<string, number>): AchievementId[] {
  const isFound = (id: string) => id in found;
  const unlocked: AchievementId[] = [];

  const total = entries.filter((e) => isFound(e.id)).length;
  for (const tier of COUNT_TIERS) {
    if (total >= tier.threshold) unlocked.push(tier.id);
  }

  const lands = groupProgress(entries, isFound, (e) => ({ key: `${e.parkId}/${e.landId}`, name: e.landId }));
  if (lands.some(isComplete)) unlocked.push("LAND_COMPLETE");

  const attractions = groupProgress(entries, isFound, (e) => ({
    key: `${e.parkId}/${e.landId}/${e.attractionId}`,
    name: e.attractionId,
  }));
  if (attractions.some(isComplete)) unlocked.push("ATTRACTION_COMPLETE");

  for (const park of groupProgress(entries, isFound, (e) => ({ key: e.parkId, name: e.parkId }))) {
    if (isComplete(park)) unlocked.push(parkAchievementId(park.key));
  }

  return unlocked;
}

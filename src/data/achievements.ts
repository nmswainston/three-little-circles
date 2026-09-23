import { entries } from "./entries";
import { getDestinationSummaries } from "./destinations";
import { HiddenMickeyEntry } from "./types";
import { groupProgress, isComplete } from "../utils/progress";
import { ParkKey } from "../theme/themes";
import { PARK_ICONS } from "../theme/parks";

/**
 * Achievement catalog and the pure rules for earning them.
 *
 * Three kinds: fixed milestones (count tiers), skill badges (one land, one
 * attraction, hard finds, queues, a Hidden Surprise, a same-day streak, two
 * regions), and one completion badge per destination that has content. Ids
 * are stable strings because they are persisted on the device.
 *
 * A badge the shipped content can't satisfy yet stays out of the catalog, so
 * nobody stares at "Find 50 details" in a guide with twelve. It comes back
 * on its own as content lands.
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

type RuleContext = {
  found: Record<string, number>;
  /** Entries in the found map that exist in the content, in content order. */
  foundEntries: HiddenMickeyEntry[];
};

type Rule = Achievement & {
  /** Pure: does this found map satisfy the badge? */
  earned: (ctx: RuleContext) => boolean;
  /** Can the shipped content ever satisfy it? */
  reachable: () => boolean;
};

const HARD_FINDS = 5;
const QUEUE_FINDS = 3;
const STREAK_FINDS = 3;

const countTier = (id: AchievementId, threshold: number, title: string, description: string, icon: string): Rule => ({
  id,
  title,
  description,
  hint: threshold === 1 ? "Mark any find as found." : `Find ${threshold} hidden details across any parks.`,
  icon,
  earned: ({ foundEntries }) => foundEntries.length >= threshold,
  reachable: () => entries.length >= threshold,
});

const MILESTONES: Rule[] = [
  countTier("FIRST_FIND", 1, "First Find", "You spotted your very first hidden detail.", "star"),
  countTier("TEN_FINDS", 10, "Explorer", "Ten hidden details found.", "map"),
  countTier("TWENTY_FIVE_FINDS", 25, "Adventurer", "Twenty-five hidden details found.", "compass"),
  countTier("FIFTY_FINDS", 50, "Legend", "Fifty hidden details found.", "trophy"),
];

const byLand = (list: HiddenMickeyEntry[], isFound: (id: string) => boolean) =>
  groupProgress(list, isFound, (e) => ({ key: `${e.parkId}/${e.landId}`, name: e.landId }));
const byAttraction = (list: HiddenMickeyEntry[], isFound: (id: string) => boolean) =>
  groupProgress(list, isFound, (e) => ({ key: `${e.parkId}/${e.landId}/${e.attractionId}`, name: e.attractionId }));

/** Local calendar day, so a streak means "one day in the park", not a UTC window. */
const dayKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function mostFindsInOneDay({ found, foundEntries }: RuleContext): number {
  const perDay = new Map<string, number>();
  let best = 0;
  for (const entry of foundEntries) {
    const at = found[entry.id];
    if (typeof at !== "number" || !Number.isFinite(at)) continue;
    const key = dayKey(at);
    const n = (perDay.get(key) ?? 0) + 1;
    perDay.set(key, n);
    if (n > best) best = n;
  }
  return best;
}

let regionByPark: Map<string, string> | undefined;
const regionOf = (parkId: string): string => {
  if (!regionByPark) regionByPark = new Map(getDestinationSummaries().map((d) => [d.parkId, d.region]));
  return regionByPark.get(parkId) ?? "Florida";
};
const regionsIn = (list: HiddenMickeyEntry[]): number => new Set(list.map((e) => regionOf(e.parkId))).size;

const SKILL: Rule[] = [
  {
    id: "LAND_COMPLETE",
    title: "Land Specialist",
    description: "You found everything documented in one land.",
    hint: "Find every documented detail in a single land or resort.",
    icon: "leaf",
    earned: ({ found }) => byLand(entries, (id) => id in found).some(isComplete),
    reachable: () => entries.length > 0,
  },
  {
    id: "ATTRACTION_COMPLETE",
    title: "Attraction Master",
    description: "You found everything documented at one attraction.",
    hint: "Find every documented detail at a single attraction.",
    icon: "film",
    earned: ({ found }) => byAttraction(entries, (id) => id in found).some(isComplete),
    reachable: () => entries.length > 0,
  },
  {
    id: "EAGLE_EYE",
    title: "Eagle Eye",
    description: `${HARD_FINDS} hard-to-spot details found.`,
    hint: `Find ${HARD_FINDS} details rated Hard.`,
    icon: "eye",
    earned: ({ foundEntries }) => foundEntries.filter((e) => e.difficulty === "Hard").length >= HARD_FINDS,
    reachable: () => entries.filter((e) => e.difficulty === "Hard").length >= HARD_FINDS,
  },
  {
    id: "QUEUE_MASTER",
    title: "Queue Master",
    description: `${QUEUE_FINDS} details spotted from a queue. The wait was worth it.`,
    hint: `Find ${QUEUE_FINDS} details in queues.`,
    icon: "people",
    earned: ({ foundEntries }) => foundEntries.filter((e) => e.locationType === "Queue").length >= QUEUE_FINDS,
    reachable: () => entries.filter((e) => e.locationType === "Queue").length >= QUEUE_FINDS,
  },
  {
    id: "EASTER_EGG",
    title: "Surprise Spotter",
    description: "You noticed a Hidden Surprise, not just a Mickey.",
    hint: "Find any Hidden Surprise: an easter egg or a movie reference.",
    icon: "egg",
    earned: ({ foundEntries }) => foundEntries.some((e) => e.entryType === "FACT"),
    reachable: () => entries.some((e) => e.entryType === "FACT"),
  },
  {
    id: "HOT_STREAK",
    title: "Hot Streak",
    description: `${STREAK_FINDS} finds in a single day.`,
    hint: `Find ${STREAK_FINDS} details in one day.`,
    icon: "flame",
    earned: (ctx) => mostFindsInOneDay(ctx) >= STREAK_FINDS,
    reachable: () => entries.length >= STREAK_FINDS,
  },
  {
    id: "COAST_TO_COAST",
    title: "Coast to Coast",
    description: "Details found in two different regions.",
    hint: "Find something in two regions, like Florida and California.",
    icon: "airplane",
    earned: ({ foundEntries }) => regionsIn(foundEntries) >= 2,
    reachable: () => regionsIn(entries) >= 2,
  },
];

const FIXED: Rule[] = [...MILESTONES, ...SKILL];

const strip = ({ earned: _earned, reachable: _reachable, ...achievement }: Rule): Achievement => achievement;

export function parkAchievementId(parkId: string): AchievementId {
  return `park:${parkId}`;
}

function parkBadges(): Achievement[] {
  const parks = getDestinationSummaries().filter((d) => d.count > 0);

  // Disambiguate parks that share a name across regions.
  const nameCounts = new Map<string, number>();
  for (const park of parks) nameCounts.set(park.name, (nameCounts.get(park.name) ?? 0) + 1);

  return parks.map((park) => {
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
}

/**
 * Every achievement in display order: milestones, skill badges, then one per
 * park with content. Badges the content can't reach yet are left out unless
 * asked for, so the grid only shows what a guest can actually earn.
 */
export function getAchievements(options?: { includeUnreachable?: boolean }): Achievement[] {
  const fixed = FIXED.filter((rule) => options?.includeUnreachable || rule.reachable()).map(strip);
  return [...fixed, ...parkBadges()];
}

/** Looks an id up across the whole catalog, hidden badges included, so a persisted unlock always resolves. */
export function getAchievement(id: AchievementId): Achievement | undefined {
  return getAchievements({ includeUnreachable: true }).find((a) => a.id === id);
}

/** How many fixed badges are waiting on more content. */
export function countUnreachableAchievements(): number {
  return FIXED.filter((rule) => !rule.reachable()).length;
}

/** Pure: which achievements the given found map satisfies. */
export function computeUnlocked(found: Record<string, number>): AchievementId[] {
  const ctx: RuleContext = { found, foundEntries: entries.filter((e) => e.id in found) };
  const unlocked: AchievementId[] = FIXED.filter((rule) => rule.earned(ctx)).map((rule) => rule.id);

  for (const park of groupProgress(entries, (id) => id in found, (e) => ({ key: e.parkId, name: e.parkId }))) {
    if (isComplete(park)) unlocked.push(parkAchievementId(park.key));
  }

  return unlocked;
}

import { entries } from "./entries";
import { getDestinationSummaries } from "./destinations";
import { HiddenMickeyEntry } from "./types";
import { labelOrFallback } from "./labels";
import { groupProgress, isComplete, ProgressGroup } from "../utils/progress";
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
 * Every rule reports progress toward a goal, and a badge is earned when the
 * progress meets it, so a progress bar and an unlock can never disagree.
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

/** The land or attraction closest to done, for "Closest: Jungle Cruise". */
export interface ProgressFocus {
  /** Group key, for example "magic_kingdom/adventureland" */
  key: string;
  /** Display name of the land or attraction */
  name: string;
  parkId: string;
}

/**
 * How far a found map is toward one badge. `current` is capped at `goal` so a
 * bar never overflows and a finished badge reads "25 / 25".
 */
export interface AchievementProgress {
  current: number;
  goal: number;
  /** 0 to 1 */
  fraction: number;
  /** Units still needed: finds, days, or regions. 0 once the goal is met. */
  remaining: number;
  focus?: ProgressFocus;
}

type RawProgress = { current: number; goal: number; focus?: ProgressFocus };

type Rule = Achievement & {
  /** Pure: how far this found map is toward the badge. */
  progress: (ctx: RuleContext) => RawProgress;
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
  progress: ({ foundEntries }) => ({ current: foundEntries.length, goal: threshold }),
  reachable: () => entries.length >= threshold,
});

const MILESTONES: Rule[] = [
  countTier("FIRST_FIND", 1, "First Find", "You spotted your very first hidden detail.", "star"),
  countTier("TEN_FINDS", 10, "Explorer", "Ten hidden details found.", "map"),
  countTier("TWENTY_FIVE_FINDS", 25, "Adventurer", "Twenty-five hidden details found.", "compass"),
  countTier("FIFTY_FINDS", 50, "Legend", "Fifty hidden details found.", "trophy"),
];

const isMet = ({ current, goal }: RawProgress): boolean => goal > 0 && current >= goal;

const toProgress = ({ current, goal, focus }: RawProgress): AchievementProgress => {
  const capped = Math.min(current, goal);
  return {
    current: capped,
    goal,
    fraction: goal > 0 ? capped / goal : 0,
    remaining: goal - capped,
    ...(focus ? { focus } : {}),
  };
};

const count = (list: HiddenMickeyEntry[], goal: number, test: (e: HiddenMickeyEntry) => boolean): RawProgress => ({
  current: list.filter(test).length,
  goal,
});

const byLand = (list: HiddenMickeyEntry[], isFound: (id: string) => boolean) =>
  groupProgress(list, isFound, (e) => ({
    key: `${e.parkId}/${e.landId}`,
    name: labelOrFallback(e.display?.landName, e.landId),
  }));
const byAttraction = (list: HiddenMickeyEntry[], isFound: (id: string) => boolean) =>
  groupProgress(list, isFound, (e) => ({
    key: `${e.parkId}/${e.landId}/${e.attractionId}`,
    name: labelOrFallback(e.display?.attractionName, e.attractionId),
  }));

/**
 * The group nearest to complete: highest share found, then fewest left, then
 * content order. A finished group always wins, so "earned" still means "some
 * group is complete".
 */
function closestGroup(groups: ProgressGroup[]): RawProgress {
  let best: ProgressGroup | undefined;
  for (const group of groups) {
    if (
      !best ||
      group.pct > best.pct ||
      (group.pct === best.pct && group.total - group.found < best.total - best.found)
    ) {
      best = group;
    }
  }
  if (!best) return { current: 0, goal: 1 };
  const parkId = best.key.split("/")[0];
  return { current: best.found, goal: best.total, focus: { key: best.key, name: best.name, parkId } };
}

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
    progress: ({ found }) => closestGroup(byLand(entries, (id) => id in found)),
    reachable: () => entries.length > 0,
  },
  {
    id: "ATTRACTION_COMPLETE",
    title: "Attraction Master",
    description: "You found everything documented at one attraction.",
    hint: "Find every documented detail at a single attraction.",
    icon: "film",
    progress: ({ found }) => closestGroup(byAttraction(entries, (id) => id in found)),
    reachable: () => entries.length > 0,
  },
  {
    id: "EAGLE_EYE",
    title: "Eagle Eye",
    description: `${HARD_FINDS} hard-to-spot details found.`,
    hint: `Find ${HARD_FINDS} details rated Hard.`,
    icon: "eye",
    progress: ({ foundEntries }) => count(foundEntries, HARD_FINDS, (e) => e.difficulty === "Hard"),
    reachable: () => entries.filter((e) => e.difficulty === "Hard").length >= HARD_FINDS,
  },
  {
    id: "QUEUE_MASTER",
    title: "Queue Master",
    description: `${QUEUE_FINDS} details spotted from a queue. The wait was worth it.`,
    hint: `Find ${QUEUE_FINDS} details in queues.`,
    icon: "people",
    progress: ({ foundEntries }) => count(foundEntries, QUEUE_FINDS, (e) => e.locationType === "Queue"),
    reachable: () => entries.filter((e) => e.locationType === "Queue").length >= QUEUE_FINDS,
  },
  {
    id: "EASTER_EGG",
    title: "Surprise Spotter",
    description: "You noticed a Hidden Surprise, not just a Mickey.",
    hint: "Find any Hidden Surprise: an easter egg or a movie reference.",
    icon: "egg",
    progress: ({ foundEntries }) => count(foundEntries, 1, (e) => e.entryType === "FACT"),
    reachable: () => entries.some((e) => e.entryType === "FACT"),
  },
  {
    id: "HOT_STREAK",
    title: "Hot Streak",
    description: `${STREAK_FINDS} finds in a single day.`,
    hint: `Find ${STREAK_FINDS} details in one day.`,
    icon: "flame",
    progress: (ctx) => ({ current: mostFindsInOneDay(ctx), goal: STREAK_FINDS }),
    reachable: () => entries.length >= STREAK_FINDS,
  },
  {
    id: "COAST_TO_COAST",
    title: "Coast to Coast",
    description: "Details found in two different regions.",
    hint: "Find something in two regions, like Florida and California.",
    icon: "airplane",
    progress: ({ foundEntries }) => ({ current: regionsIn(foundEntries), goal: 2 }),
    reachable: () => regionsIn(entries) >= 2,
  },
];

const FIXED: Rule[] = [...MILESTONES, ...SKILL];

const strip = ({ progress: _progress, reachable: _reachable, ...achievement }: Rule): Achievement => achievement;

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

const contextFor = (found: Record<string, number>): RuleContext => ({
  found,
  foundEntries: entries.filter((e) => e.id in found),
});

const byPark = (found: Record<string, number>) =>
  groupProgress(entries, (id) => id in found, (e) => ({ key: e.parkId, name: e.parkId }));

/** Pure: which achievements the given found map satisfies. */
export function computeUnlocked(found: Record<string, number>): AchievementId[] {
  const ctx = contextFor(found);
  const unlocked: AchievementId[] = FIXED.filter((rule) => isMet(rule.progress(ctx))).map((rule) => rule.id);

  for (const park of byPark(found)) {
    if (isComplete(park)) unlocked.push(parkAchievementId(park.key));
  }

  return unlocked;
}

/**
 * Pure: progress toward every badge, keyed by id. Hidden badges are included
 * so a persisted unlock always has an entry.
 *
 * Progress follows the found map as it is now, while the store keeps an
 * unlock for good. An earned badge can therefore show less than full after a
 * find is unmarked, so callers take "earned" from the store's unlocked list.
 */
export function computeProgress(found: Record<string, number>): Record<AchievementId, AchievementProgress> {
  const ctx = contextFor(found);
  const progress: Record<AchievementId, AchievementProgress> = {};

  for (const rule of FIXED) progress[rule.id] = toProgress(rule.progress(ctx));
  for (const park of byPark(found)) {
    progress[parkAchievementId(park.key)] = toProgress({ current: park.found, goal: park.total });
  }

  return progress;
}

/**
 * Pure: the unearned badges nearest to done, for the "Closest to earning"
 * list. Highest share first. Ties go to the fewest left, since "1 to go"
 * pulls harder than the same share of a big park, then to catalog order.
 */
export function closestToEarning(
  progress: Record<AchievementId, AchievementProgress>,
  unlocked: readonly AchievementId[],
  limit = 6
): AchievementId[] {
  const earned = new Set(unlocked);
  const candidates: { id: AchievementId; order: number; p: AchievementProgress }[] = [];
  getAchievements().forEach((achievement, order) => {
    const p = progress[achievement.id];
    if (p && !earned.has(achievement.id)) candidates.push({ id: achievement.id, order, p });
  });

  candidates.sort((a, b) => b.p.fraction - a.p.fraction || a.p.remaining - b.p.remaining || a.order - b.order);
  return candidates.slice(0, limit).map((c) => c.id);
}

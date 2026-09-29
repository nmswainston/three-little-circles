// Challenges are authored as JSON under content/challenges/ and compiled into
// challenges.generated.ts by `npm run content:build`, which also checks that
// every target matches real entries. This module resolves targets to entries
// and measures progress; the functions are pure so the tests can pass their
// own challenges in.
import { challenges } from "./challenges.generated";
import { entries as allEntries } from "./entries";
import { getDestination } from "./destinations";
import { labelOrFallback } from "./labels";
import { Challenge, ChallengeTarget, HiddenMickeyEntry } from "./types";
import type { ProgressFocus } from "./achievements";

export function getChallenges(): Challenge[] {
  return challenges;
}

export function getChallenge(id: string): Challenge | undefined {
  return challenges.find((c) => c.id === id);
}

/** One target of a challenge, resolved to the entries it covers. */
export type ChallengeGroup = {
  key: string;
  name: string;
  parkId: string;
  entries: HiddenMickeyEntry[];
};

export type ChallengeGroupProgress = Omit<ChallengeGroup, "entries"> & {
  found: number;
  total: number;
  /** "all": every entry found. "each" and "any": at least one found. */
  done: boolean;
};

export type ChallengeProgress = {
  current: number;
  goal: number;
  /** 0 to 1 */
  fraction: number;
  remaining: number;
  complete: boolean;
  groups: ChallengeGroupProgress[];
  /** Where to go next, when that is one place */
  focus?: ProgressFocus;
};

function targetKey(target: ChallengeTarget): string {
  if ("attraction" in target) return target.attraction;
  if ("land" in target) return target.land;
  if ("park" in target) return target.park;
  return `entry:${target.entry}`;
}

function matches(target: ChallengeTarget, e: HiddenMickeyEntry): boolean {
  if ("attraction" in target) return `${e.parkId}/${e.landId}/${e.attractionId}` === target.attraction;
  if ("land" in target) return `${e.parkId}/${e.landId}` === target.land;
  if ("park" in target) return e.parkId === target.park;
  return e.id === target.entry;
}

function targetName(target: ChallengeTarget, first: HiddenMickeyEntry | undefined): string {
  if ("attraction" in target) return labelOrFallback(first?.display?.attractionName, first?.attractionId ?? target.attraction);
  if ("land" in target) return labelOrFallback(first?.display?.landName, first?.landId ?? target.land);
  if ("park" in target) return getDestination(target.park)?.name ?? labelOrFallback(first?.display?.parkName, target.park);
  return labelOrFallback(first?.display?.entryTitle, target.entry);
}

/** Pure: each target with the entries it covers, in the challenge's order. */
export function challengeGroups(challenge: Challenge, list: HiddenMickeyEntry[] = allEntries): ChallengeGroup[] {
  return challenge.targets.map((target) => {
    const covered = list.filter((e) => matches(target, e));
    const first = covered[0];
    return {
      key: targetKey(target),
      name: targetName(target, first),
      parkId: first?.parkId ?? ("park" in target ? target.park : ""),
      entries: covered,
    };
  });
}

/**
 * Pure: how far a found map is through a challenge.
 * - "all" counts finds across every target (an entry in two targets counts once).
 * - "each" counts targets with at least one find.
 * - "any" counts targets with at least one find, up to `count`.
 */
export function challengeProgress(
  challenge: Challenge,
  found: Record<string, number>,
  list: HiddenMickeyEntry[] = allEntries
): ChallengeProgress {
  const groups = challengeGroups(challenge, list).map(({ entries, ...group }) => {
    const hits = entries.filter((e) => e.id in found).length;
    const done = challenge.goal === "all" ? hits === entries.length && entries.length > 0 : hits > 0;
    return { ...group, found: hits, total: entries.length, done };
  });

  let current: number;
  let goal: number;
  let focusGroup: ChallengeGroupProgress | undefined;

  if (challenge.goal === "all") {
    const ids = new Set(challengeGroups(challenge, list).flatMap((g) => g.entries.map((e) => e.id)));
    goal = ids.size;
    current = [...ids].filter((id) => id in found).length;
    // The unfinished target with the fewest left: "1 left at Jungle Cruise".
    for (const g of groups) {
      if (g.done) continue;
      if (!focusGroup || g.total - g.found < focusGroup.total - focusGroup.found) focusGroup = g;
    }
  } else {
    const done = groups.filter((g) => g.done).length;
    goal = challenge.goal === "each" ? groups.length : Math.min(challenge.count ?? 1, groups.length);
    current = Math.min(done, goal);
    // "each" has a definite next stop; "any" leaves the choice to the guest.
    if (challenge.goal === "each") focusGroup = groups.find((g) => !g.done);
  }

  const fraction = goal > 0 ? current / goal : 0;
  return {
    current,
    goal,
    fraction,
    remaining: goal - current,
    complete: goal > 0 && current >= goal,
    groups,
    ...(focusGroup ? { focus: { key: focusGroup.key, name: focusGroup.name, parkId: focusGroup.parkId } } : {}),
  };
}

export type ChallengeStatus = "complete" | "inProgress" | "notStarted";

/**
 * Pure: where a challenge stands. `earned` is the badge from the store, which
 * is kept for good, so a finished challenge stays finished even if a find is
 * unmarked or new finds join its targets later.
 */
export function challengeStatus(progress: ChallengeProgress, earned: boolean): ChallengeStatus {
  if (earned || progress.complete) return "complete";
  return progress.current > 0 ? "inProgress" : "notStarted";
}

/** What finishing means, in a sentence for the detail screen. */
export function goalSentence(challenge: Challenge): string {
  switch (challenge.goal) {
    case "all":
      return "Find every hidden detail below.";
    case "each":
      return "Find at least one in every place below.";
    case "any":
      return `Find something at any ${challenge.count ?? 1} of the places below.`;
  }
}

/** The unit a challenge counts in: finds for "all", places otherwise. */
export function progressUnit(challenge: Challenge): string {
  return challenge.goal === "all" ? "found" : "places";
}

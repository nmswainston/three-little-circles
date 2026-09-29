import { useMemo } from "react";
import { ChallengeProgress, challengeProgress, getChallenges } from "../data/challenges";
import { useFoundStore } from "./useFoundStore";

/** Progress through every challenge, keyed by challenge id, recomputed when finds change. */
export function useChallengeProgress(): Record<string, ChallengeProgress> {
  const found = useFoundStore((s) => s.found);
  return useMemo(() => Object.fromEntries(getChallenges().map((c) => [c.id, challengeProgress(c, found)])), [found]);
}

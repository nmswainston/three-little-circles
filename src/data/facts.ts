// Park facts are authored as JSON under content/facts/ and compiled into
// facts.generated.ts by `npm run content:build`. This module is the stable
// import path for the rest of the app.
import { facts } from "./facts.generated";
import { getDestination } from "./destinations";
import { ParkFact, ParkId } from "./types";

export { facts };

export function getAllFacts(): ParkFact[] {
  return facts;
}

/**
 * Facts to show on one destination's Park screen: the ones written for that
 * parkId first, then region-wide history for the region it belongs to. The
 * order within each group follows the generated file, which is sorted by id.
 */
export function getFactsForPark(parkId: ParkId): ParkFact[] {
  const region = getDestination(parkId)?.region;
  const forPark = facts.filter((f) => f.parkId === parkId);
  const forRegion = region ? facts.filter((f) => f.parkId === undefined && f.region === region) : [];
  return [...forPark, ...forRegion];
}

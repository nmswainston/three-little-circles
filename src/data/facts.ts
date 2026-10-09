// Park facts are authored as JSON under content/facts/ and compiled into
// facts.generated.ts by `npm run content:build`. This module is the stable
// import path for the rest of the app.
import { facts } from "./facts.generated";
import { DESTINATIONS, getDestination, isThemePark } from "./destinations";
import { AttractionId, LandId, ParkFact, ParkId } from "./types";

export { facts };

export function getAllFacts(): ParkFact[] {
  return facts;
}

/**
 * Facts to show on one destination's Park screen: the ones written for that
 * parkId first, then region-wide history for the region it belongs to. The
 * order within each group follows the generated file, which is sorted by id.
 *
 * Region facts only appear on theme parks. The resorts and shopping buckets
 * show just their own facts so resort-wide history is not repeated six times.
 * Facts about one attraction belong to its finds and stay off this list.
 */
export function getFactsForPark(parkId: ParkId): ParkFact[] {
  const region = getDestination(parkId)?.region;
  const forPark = facts.filter((f) => f.parkId === parkId && f.attractionId === undefined);
  const forRegion =
    region && isThemePark(parkId) ? facts.filter((f) => f.parkId === undefined && f.region === region) : [];
  return [...forPark, ...forRegion];
}

/**
 * History and trivia about one attraction, shown on every find there. The
 * order follows the generated file, which is sorted by id.
 */
export function getFactsForAttraction(parkId: ParkId, landId: LandId, attractionId: AttractionId): ParkFact[] {
  return facts.filter((f) => f.parkId === parkId && f.landId === landId && f.attractionId === attractionId);
}

/**
 * How many facts each listed destination's Park screen would show. Lets the
 * Parks screen open a destination that has history to read even before any
 * finds are documented for it.
 */
export function getFactCountsByPark(): Map<ParkId, number> {
  return new Map(DESTINATIONS.map((d) => [d.parkId, getFactsForPark(d.parkId).length]));
}

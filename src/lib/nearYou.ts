import { Coordinates, HiddenMickeyEntry } from "../data/types";
import { nearest } from "./geo";

/** Closer than this to a find and you are in its land. */
export const NEAR_YOU_RANGE_METERS = 400;

export type NearYou = {
  parkId: string;
  landId: string;
  /** The land's display name, from the closest find. */
  landName?: string;
  parkName?: string;
  /** How many finds the land has, and how many of them are marked found. */
  total: number;
  found: number;
};

/**
 * The land the guest is standing in, taken from the closest find with
 * coordinates. Undefined when nothing is close enough to say, for example
 * when they are outside a park. Pure so it can be tested without a device.
 */
export function findNearYou(
  entries: HiddenMickeyEntry[],
  origin: Coordinates,
  found: Record<string, unknown>
): NearYou | undefined {
  const closest = nearest(entries, origin);
  if (!closest || closest.meters > NEAR_YOU_RANGE_METERS) return undefined;

  const { parkId, landId, display } = closest.item;
  const inLand = entries.filter((e) => e.parkId === parkId && e.landId === landId);
  return {
    parkId,
    landId,
    landName: display?.landName,
    parkName: display?.parkName,
    total: inLand.length,
    found: inLand.filter((e) => e.id in found).length,
  };
}

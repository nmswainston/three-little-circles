import { Coordinates } from "../data/types";

/**
 * Distance helpers for the "closest to you" list. Everything here is pure so
 * it can be tested without a device.
 */

const EARTH_RADIUS_METERS = 6371008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in meters (haversine). Accurate to well under a meter at park scale. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A guest's pace through a park, allowing for crowds and stopping to look. */
export const WALK_METERS_PER_MINUTE = 80;

/** Farther than this and you are not in the same park as the find. */
export const WALKING_RANGE_METERS = 2500;

export type DistanceUnits = "mi" | "km";

/** US destinations read in miles, everywhere else in kilometers. */
export function unitsForRegion(region?: string): DistanceUnits {
  return region === "Florida" || region === "California" ? "mi" : "km";
}

/**
 * A coarse label for a distance. Coordinates are only accurate to about a
 * building, so this deliberately avoids precise meters: walking minutes in
 * range, a rounded distance beyond, and "Far away" once it stops mattering.
 */
export function distanceLabel(meters: number, units: DistanceUnits = "mi"): string {
  if (meters < 40) return "Right here";
  if (meters <= WALKING_RANGE_METERS) {
    return `${Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE))} min walk`;
  }
  const value = units === "mi" ? meters / 1609.344 : meters / 1000;
  if (value >= 1000) return "Far away";
  const rounded = value < 10 ? value.toFixed(1) : String(Math.round(value));
  return `${rounded} ${units} away`;
}

export type Located<T> = { item: T; meters: number };

/** Items that have coordinates, closest first. Items without coordinates are left out. */
export function sortByDistance<T extends { coordinates?: Coordinates }>(items: T[], origin: Coordinates): Located<T>[] {
  const located: Located<T>[] = [];
  for (const item of items) {
    if (item.coordinates) located.push({ item, meters: distanceMeters(origin, item.coordinates) });
  }
  return located.sort((a, b) => a.meters - b.meters);
}

/** The closest item with coordinates, or undefined when there is none. */
export function nearest<T extends { coordinates?: Coordinates }>(items: T[], origin: Coordinates): Located<T> | undefined {
  let best: Located<T> | undefined;
  for (const item of items) {
    if (!item.coordinates) continue;
    const meters = distanceMeters(origin, item.coordinates);
    if (!best || meters < best.meters) best = { item, meters };
  }
  return best;
}

import { getEntryById } from "../data/query";
import { labelOrFallback } from "../data/labels";

export type LastViewed = {
  entryId: string;
  parkId: string;
  title: string;
  attractionName: string;
};

/**
 * What the Parks home shows for the find the guest opened last. Undefined when
 * there is none, or when it has since been removed from the guide.
 */
export function describeLastViewed(entryId: string | undefined): LastViewed | undefined {
  const entry = entryId ? getEntryById(entryId) : undefined;
  if (!entry) return undefined;
  return {
    entryId: entry.id,
    parkId: entry.parkId,
    title: labelOrFallback(entry.display?.entryTitle, "Hidden Find"),
    attractionName: labelOrFallback(entry.display?.attractionName, "Attraction"),
  };
}

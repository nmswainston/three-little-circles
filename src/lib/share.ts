import { Platform, Share } from "react-native";
import { HiddenMickeyEntry } from "../data/types";
import { labelOrFallback } from "../data/labels";

export const APP_NAME = "Three Little Circles";

const details = (n: number) => `${n} hidden detail${n === 1 ? "" : "s"}`;

/**
 * Text for sharing one entry. It names the find and where it is, never where
 * to look within the scene, so a share can't spoil the hunt for the reader.
 */
export function entryShareText(entry: HiddenMickeyEntry, found: boolean): string {
  const title = labelOrFallback(entry.display?.entryTitle, "hidden detail");
  const attraction = entry.display?.attractionName?.trim();
  const park = entry.display?.parkName?.trim();
  const place = [attraction ? `at ${attraction}` : "", park ? `in ${park}` : ""].filter(Boolean).join(" ");
  const lead = found ? `I found the ${title}` : `Hunting the ${title}`;
  const ask = found ? "" : " Any tips?";
  return `${lead}${place ? ` ${place}` : ""}. ${entry.difficulty} to spot.${ask} Tracked with ${APP_NAME}.`;
}

export type ParkProgress = { name: string; found: number; total: number };

/** Text for sharing progress in one park. */
export function parkShareText(park: ParkProgress): string {
  if (park.total === 0) return `Exploring ${park.name} with ${APP_NAME}.`;
  if (park.found === park.total) {
    return `Found all ${details(park.total)} in ${park.name}. Tracked with ${APP_NAME}.`;
  }
  return `${park.found} of ${details(park.total)} found in ${park.name}. Tracked with ${APP_NAME}.`;
}

/** Text for sharing overall progress: the total, then one line per park you've started, then badges. */
export function progressShareText(found: number, total: number, parks: ParkProgress[], badges: number): string {
  const lines = [`${found} of ${details(total)} found so far. Tracked with ${APP_NAME}.`];
  const started = parks.filter((p) => p.found > 0).map((p) => `${p.name} ${p.found}/${p.total}`);
  if (started.length > 0) lines.push(started.join(" · "));
  if (badges > 0) lines.push(`${badges} badge${badges === 1 ? "" : "s"} earned.`);
  return lines.join("\n");
}

export type ShareOutcome = "shared" | "dismissed" | "copied" | "unavailable";

/**
 * Opens the phone's share sheet. A browser without one gets the text on the
 * clipboard instead, so the button still does something useful on web.
 */
export async function shareText(message: string, title: string = APP_NAME): Promise<ShareOutcome> {
  try {
    const result = await Share.share({ message, title }, { dialogTitle: title, subject: title });
    return result.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch {
    if (Platform.OS === "web") {
      try {
        const Clipboard: typeof import("expo-clipboard") = require("expo-clipboard");
        await Clipboard.setStringAsync(message);
        return "copied";
      } catch {
        // No clipboard either; fall through.
      }
    }
    return "unavailable";
  }
}

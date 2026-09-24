import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * The "Send feedback" button on Profile. It opens the phone's mail app with
 * the subject and the build details filled in, so a tester only has to type
 * what went wrong. The address comes from EXPO_PUBLIC_FEEDBACK_EMAIL at build
 * time; without one the button stays hidden, since a button that goes nowhere
 * is worse than no button.
 */
export function feedbackEmail(): string | undefined {
  const value = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL?.trim();
  return value ? value : undefined;
}

export type FeedbackContext = {
  /** App version from the build, or undefined in development. */
  version?: string;
  platform: string;
  osVersion: string | number;
};

const PLATFORM_NAMES: Record<string, string> = { ios: "iOS", android: "Android", web: "web" };

export function currentFeedbackContext(): FeedbackContext {
  return {
    version: Constants.expoConfig?.version ?? undefined,
    platform: PLATFORM_NAMES[Platform.OS] ?? Platform.OS,
    osVersion: Platform.Version,
  };
}

export const FEEDBACK_SUBJECT = "Three Little Circles feedback";

/** A mailto: URL with the subject filled in and the build details under a blank space for the notes. */
export function feedbackMailto(email: string, context: FeedbackContext): string {
  const build = `App ${context.version ?? "development build"} on ${context.platform} ${context.osVersion}`;
  const body = `\n\n\n---\n${build}`;
  return `mailto:${email}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

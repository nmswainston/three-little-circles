import { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Screens that live inside a tab's stack. Both the Parks and Map tabs use
 * this list; each registers the subset it needs.
 */
export type RootStackParamList = {
  Parks: undefined;
  Park: { parkId: string };
  EntryDetail: { entryId: string };
  SubmitSighting: { parkId?: string } | undefined;
  /**
   * focusEntryId zooms to that entry's pin and opens its label. challengeId
   * shows only that challenge's finds until the guest picks a park or clears it.
   * locate finds the guest on the map as soon as it opens.
   */
  Map: { focusEntryId?: string; challengeId?: string; locate?: boolean } | undefined;
  Profile: undefined;
  /** tab opens on Challenges instead of Badges */
  Badges: { tab?: "badges" | "challenges" } | undefined;
  ChallengeDetail: { challengeId: string };
  ImportProgress: undefined;
};

export type RootTabParamList = {
  ParksTab: NavigatorScreenParams<RootStackParamList> | undefined;
  MapTab: NavigatorScreenParams<RootStackParamList> | undefined;
  ProfileTab: undefined;
};

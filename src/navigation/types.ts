import { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Screens that live inside a tab's stack. Both the Parks and Map tabs use
 * this list; each registers the subset it needs.
 */
export type RootStackParamList = {
  Parks: undefined;
  Park: { parkId: string };
  EntryDetail: { entryId: string };
  /** landName and attractionName prefill the form, for example from a lead's detail screen */
  SubmitSighting: { parkId?: string; landName?: string; attractionName?: string } | undefined;
  /** focusEntryId zooms to that entry's pin and opens its label */
  Map: { focusEntryId?: string } | undefined;
  Profile: undefined;
  ImportProgress: undefined;
};

export type RootTabParamList = {
  ParksTab: NavigatorScreenParams<RootStackParamList> | undefined;
  MapTab: NavigatorScreenParams<RootStackParamList> | undefined;
  ProfileTab: undefined;
};

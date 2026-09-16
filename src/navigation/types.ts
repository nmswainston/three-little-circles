import { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Screens that live inside a tab's stack. Both the Parks and Map tabs use
 * this list; each registers the subset it needs.
 */
export type RootStackParamList = {
  Parks: undefined;
  Park: { parkId: string };
  EntryDetail: { entryId: string };
  Map: undefined;
  Profile: undefined;
};

export type RootTabParamList = {
  ParksTab: NavigatorScreenParams<RootStackParamList> | undefined;
  MapTab: NavigatorScreenParams<RootStackParamList> | undefined;
  ProfileTab: undefined;
};

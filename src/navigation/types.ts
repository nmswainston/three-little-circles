export type RootStackParamList = {
  Home: undefined;
  Parks: undefined;
  Park: { parkId: string };
  Land: { parkId: string; landId: string };
  Attraction: { parkId: string; landId: string; attractionId: string };
  EntryDetail: { entryId: string };
  Map: undefined;
  Profile: undefined;
};

export type ParkId = string;
export type LandId = string;
export type AttractionId = string;

export type Difficulty = "Easy" | "Medium" | "Hard";
export type LocationType = "Queue" | "Ride" | "Pre-show" | "Outdoor" | "Indoor";
export type EntryType = "FIND" | "FACT";

export type ViewingCondition = {
  motion?: string;
  lighting?: string;
  angle?: string;
  crowding?: string;
  distance?: string;
  notes?: string;
};

export type Confidence = "Obvious" | "Strong" | "Interpretive";

export type Verification = "In-person" | "Photo" | "Community" | "Unknown";

export type AreaContext =
  | "Entrance"
  | "Queue"
  | "Loading"
  | "Ride"
  | "Dock"
  | "Post-show"
  | "Exit"
  | "Lobby"
  | "Walkway"
  | "Outdoor Display"
  | "Shop";

export type DisplayAliases = {
  parkName?: string;
  landName?: string;
  attractionName?: string;
  entryTitle?: string;
};

/** Decimal degrees. Approximate to the attraction or building, not the exact spot. */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type WhereToLook = {
  scene: string;
  exactSpot: string;
  orientation?: "Upright" | "Upside-down" | "Sideways";
};

export type HiddenMickeyEntry = {
  id: string;

  parkId: ParkId;
  landId: LandId;
  attractionId: AttractionId;

  display?: DisplayAliases;

  entryType: EntryType;
  locationType: LocationType;
  description: string;
  whereToLook: WhereToLook;
  difficulty: Difficulty;

  bestTip?: string;
  funFacts?: string[];

  viewing?: ViewingCondition;
  confidence?: Confidence;
  verification?: Verification;
  areaContext?: AreaContext;

  /** Where to drop a map pin. Entries without coordinates are listed but not pinned. */
  coordinates?: Coordinates;

  createdAtISO?: string;
  updatedAtISO?: string;
};

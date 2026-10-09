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

/**
 * How the sighting was confirmed. "Documented" means it appears in official
 * material from the parks; "Community" is a report someone else published.
 */
export type Verification = "In-person" | "Photo" | "Community" | "Documented" | "Unknown";

/**
 * Whether the find is expected to be there today. "Unverified" is a desk
 * researched report nobody has checked in person yet. "Seasonal" appears
 * only at certain times, "Variable" depends on props that move, and
 * "Removed" is kept for history but is gone from the park.
 */
export type EntryStatus = "Current" | "Unverified" | "Seasonal" | "Variable" | "Removed";

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

/**
 * A reference photo bundled with the app, from content/images. While hints are
 * on and the entry is unfound it renders blurred until the guest reveals it.
 */
export type EntryImage = {
  /** File name under content/images, for example "pirates-exit-bells-mickey.jpg". */
  file: string;
  /** What the photo shows, for screen readers and for when it fails to load. */
  alt: string;
  /** Who took it, shown under the photo. */
  credit?: string;
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
  /** Date of the in-person or photo confirmation behind `verification`. */
  verifiedAtISO?: string;
  status?: EntryStatus;
  areaContext?: AreaContext;

  /** Anything a guest needs before they can get to the spot, such as resort or dining access. */
  accessNotes?: string;

  /** Where to drop a map pin. Entries without coordinates are listed but not pinned. */
  coordinates?: Coordinates;

  /** A reference photo. Entries without one show no photo card. */
  image?: EntryImage;

  /** Id of this find in the research spreadsheet, for example TLC-MK-0001. Unique across entries. */
  sourceId?: string;
  /** Primary evidence for the sighting. Kept for research, not shown to guests. */
  sourceUrl?: string;

  createdAtISO?: string;
  updatedAtISO?: string;
};

/**
 * A piece of history or trivia about a park or resort area itself, as opposed
 * to a find inside it. Facts are not counted toward progress. A fact belongs
 * to one destination (parkId) or to every destination in a region.
 */
export type ParkFact = {
  id: string;

  /** Show on this destination's Park screen. */
  parkId?: ParkId;
  /** Show on every Park screen in this region. Used for resort-wide history. */
  region?: string;

  /**
   * Set together with `attractionId` and `parkId` for a fact about one
   * attraction. These show on every find at that attraction, under the
   * find's own fun facts, and stay off the Park screen.
   */
  landId?: LandId;
  attractionId?: AttractionId;

  title: string;
  body: string;

  createdAtISO?: string;
  updatedAtISO?: string;
};

/**
 * One place a challenge covers. Exactly one key is set: an attraction as
 * "parkId/landId/attractionId", a land as "parkId/landId", a whole park by
 * parkId, or a single find by entry id. A list of ids of the same kind is
 * one place, for a resort split across two lands in the content.
 */
export type ChallengeTarget =
  | { attraction: string | string[] }
  | { land: string | string[] }
  | { park: string | string[] }
  | { entry: string | string[] };

/**
 * A themed hunt with a badge at the end. `goal` says what finishing means:
 * - "all": find every entry the targets cover.
 * - "each": find at least one entry in every target.
 * - "any": find at least one entry in `count` of the targets.
 *
 * The id is a persistence key (the badge is saved as "challenge:<id>"), so
 * leave it alone once a challenge ships.
 */
export type Challenge = {
  id: string;
  title: string;
  /** One or two sentences: what ties the targets together. */
  blurb: string;
  /** The park the challenge belongs to, for its accent color. Omit for cross-park challenges. */
  parkId?: ParkId;
  /** Ionicons glyph name */
  icon?: string;
  goal: "all" | "each" | "any";
  /** Required when goal is "any" */
  count?: number;
  targets: ChallengeTarget[];

  createdAtISO?: string;
  updatedAtISO?: string;
};

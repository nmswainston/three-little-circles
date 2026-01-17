import { HiddenMickeyEntry } from "./types";
import { RESORTS_BUCKET_ID } from "./constants";

export const entries: HiddenMickeyEntry[] = [
  {
    id: "entry_001",
    parkId: "studios_park",
    landId: "toy_blocks_area",
    attractionId: "backyard_coaster",
    display: {
      parkName: "Studios Park",
      landName: "Toy Blocks Area",
      attractionName: "Backyard Coaster",
      entryTitle: "Queue Cloud Mickey",
    },
    entryType: "FIND",
    locationType: "Queue",
    description: "The primary Hidden Mickey is in the loading area queue within a hand-drawn cloud mural in the upper right. Mention the mural and that it is easy to miss.",
    whereToLook: {
      scene: "Large hand-drawn mural of backyard coaster plans",
      exactSpot: "Upper right section of the painted clouds near the loading area",
    },
    difficulty: "Medium",
    bestTip: "Most visible when the line slows and you can scan the mural",
    funFacts: [
      "The cloud's position is a subtle nod to the former Earful Tower, the park's iconic water tower that once stood in this area.",
    ],
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "critter-popout-sideways-mickey",
    parkId: "studios_park",
    landId: "toy_blocks_area",
    attractionId: "midway_shooter",
    display: {
      entryTitle: "Critter Pop-Out Sideways Mickey",
      parkName: "Studios Park",
      landName: "Toy Blocks Area",
      attractionName: "Midway Shooter",
    },
    entryType: "FIND",
    locationType: "Queue",
    difficulty: "Hard",
    description:
      "A classic three-circle Hidden Mickey appears sideways on a dark red fireball element behind one of the Critter Pop-Out animal cutouts in the entrance queue. The beaver figure partially blocks the shape, making this one especially easy to overlook.",
    whereToLook: {
      scene: "Standing Critter Pop-Out display board along the right side of the entrance queue",
      exactSpot: "Behind the beaver cutout on the board surface behind it",
      orientation: "Sideways",
    },
    bestTip:
      "Shift your position slightly to the left of the board so you can see past the beaver cutout.",
    funFacts: [
      "This Hidden Mickey is intentionally obscured, rewarding guests who slow down and scan the queue details rather than rushing toward the entrance.",
    ],
    viewing: {
      motion: "Still",
      lighting: "Mixed",
      angle: "Left",
      crowding: "High",
      distance: "Close",
      notes: "Beaver cutout blocks the shape unless you shift slightly left.",
    },
    confidence: "Strong",
    verification: "Community",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "usa-map-queue-wall-mickey",
    parkId: "studios_park",
    landId: "toy_blocks_area",
    attractionId: "midway_shooter",
    display: {
      entryTitle: "Queue Wall Mickey",
      parkName: "Studios Park",
      landName: "Toy Blocks Area",
      attractionName: "Midway Shooter",
    },
    entryType: "FIND",
    locationType: "Queue",
    difficulty: "Hard",
    description:
      "A Hidden Mickey is tucked low on the wall just past the large U.S.A. map in the queue. It sits beneath a green dinosaur and a red fish, partially obscured by handrails on the left side, making it easy to miss unless you're looking near the floor.",
    whereToLook: {
      scene: "Wall display past the large U.S.A. map in the queue",
      exactSpot: "Below the green dinosaur and red fish, near the floor behind the handrails on the left side",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Mixed",
      angle: "Left",
      crowding: "High",
      distance: "Close",
      notes:
        "The handrails partially block the view. You may need to lean slightly or wait for space in the queue.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Scan low along the wall after passing the map. Most guests never look below handrail height.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "space-panel-star-mickey",
    parkId: "studios_park",
    landId: "toy_blocks_area",
    attractionId: "alien_spinner",
    display: {
      entryTitle: "Space Panel Star Mickey",
      parkName: "Studios Park",
      landName: "Toy Blocks Area",
      attractionName: "Alien Spinner",
    },
    entryType: "FIND",
    locationType: "Ride",
    difficulty: "Hard",
    description:
      "A subtle Hidden Mickey appears as a three-circle star pattern on a space-themed control panel graphic during the ride. The shape is formed by a bright central star with two smaller light points positioned nearby, making it easy to miss during motion.",
    whereToLook: {
      scene: "Space-themed control panel mural visible during the ride",
      exactSpot: "Star cluster on the purple space background near the control panel edge",
      orientation: "Upright",
    },
    bestTip:
      "Look for it when the ride briefly slows or pauses. The motion makes this one easy to miss on a first ride.",
    funFacts: [
      "This Hidden Mickey relies on star placement rather than a drawn outline, blending naturally into the space scenery.",
    ],
    viewing: {
      motion: "Fast",
      lighting: "Mixed",
      angle: "Straight-on",
      notes: "Easiest to spot during a brief slow-down or pause.",
    },
    confidence: "Strong",
    verification: "Photo",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "toy-story-release-date-box",
    parkId: "studios_park",
    landId: "toy_blocks_area",
    attractionId: "backyard_coaster",
    display: {
      entryTitle: "Toy Story Release Date Easter Egg",
      parkName: "Studios Park",
      landName: "Toy Blocks Area",
      attractionName: "Backyard Coaster",
    },
    entryType: "FACT",
    locationType: "Ride",
    difficulty: "Medium",
    description:
      "A hidden numeric detail appears on a large toy box featuring a painted Tyrannosaurus Rex. The numbers look like a standard price label but actually form a hidden reference rather than a character shape.",
    whereToLook: {
      scene: "Large toy box with a painted Tyrannosaurus Rex",
      exactSpot:
        "Price label on the upper left of the front of the box, visible from the right side of the loading dock or shortly after launch",
    },
    viewing: {
      motion: "Fast",
      lighting: "Bright",
      angle: "Left",
      notes:
        "Easiest to see from the right side of the loading area or by glancing left as the coaster launches.",
    },
    confidence: "Obvious",
    verification: "Community",
    funFacts: [
      "The numbers 11, 22, and 19.95 reference November 22, 1995, the release date of the first Toy Story film.",
      "This detail is a hidden tribute rather than a Hidden Mickey, blending naturally into the toy-themed scenery.",
    ],
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "totem-window-spider-mickey",
    parkId: RESORTS_BUCKET_ID,
    landId: "wilderness_lodge_resort",
    attractionId: "lobby_window_displays",
    display: {
      entryTitle: "Totem Display Spider Mickey",
      parkName: "Resorts",
      landName: "Wilderness Lodge Resort",
      attractionName: "Lobby Window Displays",
    },
    entryType: "FIND",
    locationType: "Indoor",
    difficulty: "Hard",
    description:
      "A classic three-circle Hidden Mickey appears as three small depressions on a red spider ornament. The depressions align on the ornament's body in a way that reads as the classic shape once you spot it.",
    whereToLook: {
      scene:
        "Two window displays on the right side just outside the lobby exit doors leading toward the villa walkway",
      exactSpot:
        "Second display: tall totem pole with a colorful bird at the top. Look on the bird's chest area at the red spider ornament for three small depressions forming the shape.",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Mixed",
      angle: "Straight-on",
      crowding: "Medium",
      distance: "Close",
      notes:
        "Glass reflections can hide it. Move slightly left or right to reduce glare.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Scan the second window display slowly and get close enough to see texture details. This one is more 'texture-based' than outline-based.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "gran-destino-elevator-wall-mickey",
    parkId: RESORTS_BUCKET_ID,
    landId: "coronado_springs_gran_destino",
    attractionId: "top_floor_elevator_bank",
    display: {
      entryTitle: "Elevator Bank Wall Mickey",
      parkName: "Resorts",
      landName: "Gran Destino Tower",
      attractionName: "Top Floor Elevator Bank",
    },
    entryType: "FIND",
    locationType: "Indoor",
    difficulty: "Medium",
    description:
      "A classic three-circle Hidden Mickey appears within the ornate wall design above the elevator doors on the top floor. The shape blends into the decorative pattern and is easy to miss unless you look directly above the elevator bank.",
    whereToLook: {
      scene:
        "Top floor elevator bank inside Gran Destino Tower, accessed via the side elevators from the lobby",
      exactSpot:
        "Ornate wall design directly above the elevator doors on the top floor",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Bright",
      angle: "Straight-on",
      crowding: "Low",
      distance: "Medium",
      notes:
        "Step back slightly from the elevator doors to take in the full wall pattern.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Ride to the top floor using the side elevators and scan above the doors before exiting the elevator area.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "homecomin-entrance-wall-painting-mickey",
    parkId: "springs_bucket",
    landId: "homecomin_restaurant",
    attractionId: "entrance_wall_painting",
    display: {
      entryTitle: "Entrance Wall Painting Mickey",
      parkName: "Springs",
      landName: "Homecomin' Restaurant",
      attractionName: "Main Entrance",
    },
    entryType: "FIND",
    locationType: "Indoor",
    difficulty: "Hard",
    description:
      "A small white classic Hidden Mickey is tucked into the lower portion of a large wall painting just inside the main entrance. The shape blends into the painted ground area and is easy to miss unless you know exactly where to look.",
    whereToLook: {
      scene:
        "Large wall painting inside the main entrance featuring the sun, orchards, and a stream",
      exactSpot:
        "In the dirt area at the lower left of the painting, behind and between the first and second wall lamps from the left",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Mixed",
      angle: "Right",
      crowding: "High",
      distance: "Close",
      notes:
        "Wall lamps and foot traffic can block the view. Best spotted when the entry area briefly clears.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Stand close to the wall and scan low between the first two lamps from the left before moving further inside.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "riviera-mural-teddy-bear-mickey",
    parkId: RESORTS_BUCKET_ID,
    landId: "riviera_resort",
    attractionId: "skyliner_arch_murals",
    display: {
      entryTitle: "Mural Teddy Bear Mickey",
      parkName: "Resorts",
      landName: "Riviera Resort",
      attractionName: "Skyliner Walkway Murals",
    },
    entryType: "FIND",
    locationType: "Outdoor",
    difficulty: "Medium",
    description:
      "As you walk from the gondola station toward the resort, you pass under a series of colorful arch murals. In the first mural, a small teddy bear silhouette is shaped in a way that reads like the classic three-circle Mickey when you catch it at the right angle.",
    whereToLook: {
      scene: "First arch mural along the walkway from the gondola station toward the resort entrance",
      exactSpot:
        "In the sky portion of the mural, locate the small teddy bear. The bear's head-and-ears silhouette forms the classic three-circle shape.",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Bright",
      angle: "Above",
      crowding: "Medium",
      distance: "Medium",
      notes:
        "You'll spot it easiest by pausing briefly and looking upward before passing fully under the arch.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Slow down before you walk directly under the first arch so you can scan the mural without neck-craning mid-stride.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "vero-beach-lobby-display-mickey-30th",
    parkId: RESORTS_BUCKET_ID,
    landId: "vero_beach_resort",
    attractionId: "lobby_anniversary_display",
    display: {
      entryTitle: "Lobby Display Mickey",
      parkName: "Resorts",
      landName: "Vero Beach Resort",
      attractionName: "Lobby Display",
    },
    entryType: "FIND",
    locationType: "Indoor",
    difficulty: "Medium",
    description:
      "A classic three-circle Hidden Mickey appears in a lobby anniversary display. The shape is located in the lower right portion of the display and is easiest to spot when you view the full arrangement from a step or two back.",
    whereToLook: {
      scene: "Lobby anniversary display area",
      exactSpot:
        "Lower right portion of the anniversary display (scan the bottom-right details rather than the main centerpiece).",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Mixed",
      angle: "Straight-on",
      crowding: "Medium",
      distance: "Medium",
      notes:
        "Displays like this can change seasonally. If the anniversary display is removed, this find may no longer be present.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Stand back far enough to see the whole display, then scan the lower right area slowly for the three-circle shape.",
    funFacts: [
      "This Hidden Mickey was reported as part of the resort's 30th Anniversary lobby display, which may be temporary or seasonal.",
    ],
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "pirates-exit-bells-mickey",
    parkId: "magic_kingdom_park",
    landId: "pirate_port_area",
    attractionId: "exit_artifact_room",
    display: {
      entryTitle: "Exit Bells Mickey",
      parkName: "Kingdom Park",
      landName: "Pirate Port Area",
      attractionName: "Exit Artifact Room",
    },
    entryType: "FIND",
    locationType: "Indoor",
    difficulty: "Medium",
    areaContext: "Exit",
    description:
      "A classic three-circle Hidden Mickey is formed by three small round bells mounted near the ceiling in a small artifact display room just outside the ride exit. Because the display is above eye level, most guests walk through without ever looking up.",
    whereToLook: {
      scene:
        "Small display room just outside the ride exit, filled with artifacts, urns, and candles",
      exactSpot:
        "Near the ceiling: three small round bells arranged in the classic shape. Enter the room and turn around to look upward.",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Dim",
      angle: "Above",
      crowding: "Medium",
      distance: "Medium",
      notes:
        "The room lighting is low. Give your eyes a moment to adjust before scanning upward.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "After exiting the ride and entering the display room, stop briefly and turn around before continuing toward the gift shop exit.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: "art-animation-package-pickup-mickey",
    parkId: RESORTS_BUCKET_ID,
    landId: "art_of_animation_resort",
    attractionId: "gift_shop_package_pickup",
    display: {
      entryTitle: "Package Pick-Up Mickey",
      parkName: "Resorts",
      landName: "Art of Animation Resort",
      attractionName: "Gift Shop Package Pick-Up Area",
    },
    entryType: "FIND",
    locationType: "Indoor",
    areaContext: "Shop",
    difficulty: "Hard",
    description:
      "A small full-body Mickey figurine is hidden in the shadows behind the Package Pick-Up area inside the gift shop. The figure sits just below and slightly behind the round Package Pick-Up sign, making it difficult to notice unless you know to look into the darker area.",
    whereToLook: {
      scene:
        "Package Pick-Up area inside the gift shop near the food court",
      exactSpot:
        "In the shadows behind and just below the round Package Pick-Up sign",
      orientation: "Upright",
    },
    viewing: {
      motion: "Still",
      lighting: "Dim",
      angle: "Straight-on",
      crowding: "Medium",
      distance: "Close",
      notes:
        "The figure blends into the dark background. Give your eyes a moment to adjust before scanning below the sign.",
    },
    confidence: "Strong",
    verification: "Community",
    bestTip:
      "Look just under the sign rather than at eye level. Most guests scan too high and miss it.",
    createdAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
  },
];

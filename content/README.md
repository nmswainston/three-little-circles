# Content

Every Hidden Mickey lives in its own JSON file under `content/entries/`. The app
never reads these files directly. Instead `npm run content:build` validates them
and writes `src/data/entries.generated.ts`, which is what the app imports.

## Adding an entry

1. Copy `content/TEMPLATE.json` to `content/entries/<id>.json`.
2. Set `id` to a lowercase kebab-case slug. The file name must match the id.
3. Fill in the fields. Delete any optional field you do not have information for.
4. Run `npm run content:build`. It fails with a readable message if anything is off.
5. Commit both the new JSON file and the regenerated `entries.generated.ts`.

`npm start`, `npm run ios`, `npm run android`, and `npm run web` all run the build
automatically first, so a stale generated file will not sneak into a dev session.

## Field reference

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | kebab-case slug, unique across all entries |
| `parkId` | yes | stable id for the destination bucket, for example `studios_park` or `resorts_bucket` |
| `landId` | yes | stable id for the land or resort within the park |
| `attractionId` | yes | stable id for the attraction or specific spot |
| `display` | no | human-readable names: `parkName`, `landName`, `attractionName`, `entryTitle` |
| `entryType` | yes | `FIND` for a Hidden Mickey, `FACT` for an easter egg or tribute |
| `locationType` | yes | `Queue`, `Ride`, `Pre-show`, `Outdoor`, `Indoor` |
| `difficulty` | yes | `Easy`, `Medium`, `Hard` |
| `areaContext` | no | `Entrance`, `Queue`, `Loading`, `Ride`, `Dock`, `Post-show`, `Exit`, `Lobby`, `Walkway`, `Outdoor Display`, `Shop` |
| `description` | yes | free text |
| `whereToLook` | yes | `scene` and `exactSpot` required, `orientation` optional: `Upright`, `Upside-down`, `Sideways` |
| `bestTip` | no | free text |
| `funFacts` | no | array of strings |
| `viewing` | no | `motion`, `lighting`, `angle`, `crowding`, `distance`, `notes` as free text |
| `confidence` | no | `Obvious`, `Strong`, `Interpretive` |
| `verification` | no | `In-person`, `Photo`, `Community`, `Unknown` |
| `coordinates` | no | `latitude` and `longitude` as decimal degrees. Entries without coordinates are listed on the map screen but not pinned. |
| `createdAtISO`, `updatedAtISO` | no | ISO 8601 timestamps |

## Naming conventions

The app is an unofficial fan project. Park, land, and attraction display names
use generic descriptive names rather than trademarked ones, for example
"Studios Park" and "Backyard Coaster". Keep new entries consistent with the
names already used for the same `parkId`, `landId`, and `attractionId`. The
build script rejects an entry whose display names disagree with an existing
entry for the same id.

## Coordinates

Coordinates on the current entries were placed by hand from public maps and are
approximate to roughly a building. Tighten them when you can verify on site.

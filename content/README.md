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

## Importing from a spreadsheet

For many finds at once, keep them in a spreadsheet and import the CSV export:

1. Use the columns in [`TEMPLATE.csv`](TEMPLATE.csv) as your header row, or keep
   your own headers and map them in `content/import-map.json` like
   `{"exactSpot": "Where exactly", "bestTip": "Tip"}` (entry field on the left,
   your header on the right; headers are matched ignoring case).
2. Export the sheet as CSV (File, Download or Save As, CSV).
3. Preview, then import:

   ```bash
   npm run content:import-csv -- path/to/finds.csv --dry-run
   npm run content:import-csv -- path/to/finds.csv
   npm run content:build
   ```

Rows with problems are listed with their line number and skipped; fix them in
the sheet and run again. Rows whose id already exists are skipped unless you
pass `--overwrite`.

What the importer does for you:

- `park` accepts a name from `destinations.json` or a parkId. Names that exist
  in several regions need a `region` column, or write `Kingdom Park (Paris)`.
- Land and attraction ids are reused from entries already in that park when
  the names match, so new finds group with existing ones. A `land id` or
  `attraction id` column overrides that.
- Values like `hard`, `pre show`, or `sideways` are normalized to the exact
  enum spellings. Fun facts can be separated with `|` or line breaks.
- Coordinates can be `latitude` and `longitude` columns or one `coordinates`
  cell such as `28.35634, -81.56281`, which is the format the app's map copies.
- The entry id is built from the attraction and title unless an `id` column
  provides one.

## Field reference

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | kebab-case slug, unique across all entries |
| `parkId` | yes | stable id for the destination bucket, for example `studios_park` or `resorts_bucket` |
| `landId` | yes | stable id for the land or resort within the park |
| `attractionId` | yes | stable id for the attraction or specific spot |
| `display` | no | human-readable names: `parkName`, `landName`, `attractionName`, `entryTitle` |
| `entryType` | yes | `FIND` for a Hidden Mickey, `FACT` for a Hidden Surprise such as an easter egg or movie reference |
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

## Park facts

Facts are history and trivia about a park or resort area itself, as opposed to
a find inside it: how the land was bought, what the sphere is made of, why the
park is on the second floor. They show in a "Did you know?" section at the
bottom of the Park screen and do not count toward progress.

Each fact is one JSON file under `content/facts/`. Copy
[`TEMPLATE.fact.json`](TEMPLATE.fact.json) to `content/facts/<id>.json` and run
`npm run content:build`, which validates it and regenerates
`src/data/facts.generated.ts`. Commit both.

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | kebab-case slug, unique across all facts, must match the file name |
| `parkId` | one of | a `parkId` from `destinations.json`; the fact shows on that Park screen |
| `region` | one of | a region from `destinations.json`; the fact shows on every Park screen in that region, after the park's own facts |
| `title` | yes | a few words |
| `body` | yes | two to four sentences |
| `createdAtISO`, `updatedAtISO` | no | ISO 8601 timestamps |

Set exactly one of `parkId` or `region`. Use `region` for resort-wide history
such as how the Florida land was assembled, and `parkId` for anything specific
to one park. Facts are shown in id order, so a numeric or alphabetical prefix
controls the order within a park if you need one.

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

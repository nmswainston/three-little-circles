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

Keys go in the order the [field reference](#field-reference) lists them, so a
diff shows what changed rather than what moved. Add a field wherever you like
and run `npm run content:format` before committing: it rewrites every entry,
fact, and challenge as two-space JSON in that order, nested objects included,
and never touches a value. The build fails on a file that is out of order and
names the key. `npm run content:format -- --check` lists such files without
writing anything.

`npm start`, `npm run ios`, `npm run android`, and `npm run web` all run the build
automatically first, so a stale generated file will not sneak into a dev session.

## Adding a photo

One command takes a photo straight off a phone and attaches it to an entry:

```bash
npm run content:photo -- <entry-id> path/to/photo.jpg --alt "Three brass bells near the ceiling" --credit "Nick S."
```

It bakes the orientation into the pixels, resizes to at most 1200 px on the
long side, re-encodes as a JPEG under the 300 KB limit, strips all metadata
(phone photos carry GPS and device details), writes
`content/images/<entry-id>.jpg`, fills the entry's `image` field, and runs the
content build. Commit the photo, the entry, and `src/data/images.generated.ts`.

`--alt` is required: say what the photo shows, for screen readers. `--credit`
is optional. Pass `--replace` to swap an existing photo and `--dry-run` to see
the result without writing anything. HEIC files need exporting as JPEG first;
sharing from an iPhone with AirDrop or Mail does that. The rules the photo has
to meet are in [content/images/README.md](images/README.md).

## Checking finds in the park

The verification kit turns every entry into a walking checklist you can use
on your phone or print:

```bash
npm run content:kit
```

It writes `kit/index.html` (all parks in one page, pick the park at the top)
and one `kit/<parkId>.csv` per park. Lands come in the order you walk them
from the gate, attractions in a nearest-first path through each land, and
finds within an attraction from entrance to exit. Each find shows its sheet
id, status, scene, exact spot, and tip, with Found, Not found, and Changed
buttons, a photo checkbox, and a notes line.

Results stay in that browser. Tap **Copy results** to get them as CSV with
the columns `find_id, entry_id, park, land, attraction, title, app_status,
outcome, photo_taken, notes, checked_at`, then paste them into the
spreadsheet's Onsite Verification tab and update the entries by hand. The
`kit/` folder is ignored by git; regenerate it whenever entries change.

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
  in several regions need a `region` column, or write `Disneyland Park (Paris)`.
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

Fields are listed in the order they go in the file.

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | kebab-case slug, unique across all entries |
| `parkId` | yes | stable id for the destination bucket, for example `studios_park` or `resorts_bucket` |
| `landId` | yes | stable id for the land or resort within the park |
| `attractionId` | yes | stable id for the attraction or specific spot |
| `display` | no | human-readable names: `entryTitle`, `parkName`, `landName`, `attractionName` |
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
| `verification` | no | `In-person`, `Photo`, `Community`, `Documented` (appears in official park material), `Unknown` |
| `verifiedAtISO` | no | ISO 8601 date of the in-person or photo confirmation |
| `status` | no | `Current`, `Unverified` (desk researched, not yet checked in person), `Seasonal`, `Variable` (depends on props that move), `Removed` (kept for history, gone from the park). Shown as a chip on the detail screen except for `Current`. |
| `accessNotes` | no | free text: what a guest needs to reach the spot, such as resort or dining access |
| `coordinates` | no | `latitude` and `longitude` as decimal degrees. Entries without coordinates are listed on the map screen but not pinned. |
| `image` | no | `file` (a photo in `content/images/`), `alt` (required, what it shows), `credit` (optional). See [content/images/README.md](images/README.md) for the rules. Blurred in the app until revealed while hints are on. |
| `sourceId` | no | the find's id in the research spreadsheet, for example `TLC-MK-0001`. Unique across entries; the reconcile script matches on it. |
| `sourceUrl` | no | primary evidence URL. Kept for research, never shown to guests. |
| `createdAtISO`, `updatedAtISO` | no | ISO 8601 timestamps |

## Reconciling with the research spreadsheet

The research spreadsheet is the register of candidate finds; entries here are
the ones written up for the app. Each entry carries the spreadsheet's id in
`sourceId`. After the spreadsheet changes, export its Master tab as CSV and run:

```bash
npm run content:reconcile -- path/to/master.csv
```

It lists spreadsheet rows with no entry yet (grouped by status), entries whose
`sourceId` is no longer in the spreadsheet, and entries whose `status` disagrees
with the spreadsheet. It changes nothing; act on the report by hand.

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
| `region` | one of | a region from `destinations.json`; the fact shows on every theme park in that region, after the park's own facts. Catch-all areas with a `_bucket` id, such as the resorts and the shopping district, show only their own facts |
| `landId`, `attractionId` | together | with `parkId`, the ids of an attraction that already has entries. The fact then shows on every find at that attraction, in an "About" card under the find's own fun facts, and stays off the Park screen |
| `title` | yes | a few words |
| `body` | yes | two to four sentences |
| `createdAtISO`, `updatedAtISO` | no | ISO 8601 timestamps |

Set exactly one of `parkId` or `region`. Use `region` for resort-wide history
such as how the Florida land was assembled, and `parkId` for anything specific
to one park. Add `landId` and `attractionId` for the history of one ride,
show, or shop: when it opened, what it replaced, how it was built. Keep it to
the attraction itself; anything you find inside it is an entry. Facts are
shown in id order, so a numeric or alphabetical prefix controls the order
within a park or attraction if you need one.

## Challenges

A challenge is a themed hunt with a badge at the end: every find on the
attractions Walt Disney worked on, one find in each World Showcase pavilion,
something at five different resorts. Guests see their progress with a bar,
and finishing a challenge unlocks its badge like any other.

Each challenge is one JSON file under `content/challenges/`. Copy
[`TEMPLATE.challenge.json`](TEMPLATE.challenge.json) to
`content/challenges/<id>.json` and run `npm run content:build`, which validates
it, checks that every target matches real entries, and regenerates
`src/data/challenges.generated.ts`. Commit both.

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | kebab-case slug, unique across all challenges, must match the file name. The badge is saved as `challenge:<id>`, so leave the id alone once it ships. |
| `title` | yes | a few words |
| `blurb` | yes | one or two sentences on what ties the targets together. Shown on the challenge and as the badge's hint. |
| `parkId` | no | a `parkId` from `destinations.json`. Gives the challenge that park's color. Omit it for challenges that cross parks. |
| `icon` | no | an [Ionicons](https://icons.expo.fyi) glyph name. Defaults to `flag`. |
| `goal` | yes | `all`, `each`, or `any`; see below |
| `count` | with `any` | how many targets need a find, from 1 to the number of targets |
| `targets` | yes | a list of places, each an object with exactly one key: `attraction` (`parkId/landId/attractionId`), `land` (`parkId/landId`), `park` (a `parkId`), or `entry` (an entry id). The value can also be a list of ids of that kind, which counts as one place; see below. |
| `createdAtISO`, `updatedAtISO` | no | ISO 8601 timestamps |

The goal says what finishing means:

- `all`: find every entry the targets cover. An entry covered by two targets
  counts once. Use it for "every hidden detail at these attractions".
- `each`: find at least one entry in every target. Use it for "one in every
  pavilion".
- `any`: find at least one entry in `count` of the targets. Use it for "five
  different resorts".

One place can span several ids. A resort split across two lands in the
content, such as Coronado Springs and its Gran Destino Tower, is written as
`{"land": ["resorts_bucket/coronado_springs_resort", "resorts_bucket/coronado_springs_gran_destino"]}`.
Finds in either land count toward that one place, and it takes its name from
the first id. Every id in the list must match entries.

Targets are ids, not names, so they keep working when a display name changes.
An `attraction`, `land`, or `park` target picks up new entries added there
later, which can grow an `all` challenge after a guest has finished it; the
badge they earned stays earned. Use `entry` targets when a challenge should
cover exactly the finds chosen for it.

Like entries, challenges are written in the app's voice and only claim what
the finds support. Check history in a blurb, such as which attractions Walt
worked on, against a reliable source before it ships.

## Naming conventions

The app is an unofficial fan project. Park, land, and attraction display names
use the real names, for example "Disney's Hollywood Studios" and "Slinky Dog
Dash", because naming the thing a find is attached to is what makes an entry
usable. Use plain text only: no logos, no park or attraction wordmarks, no
character art.

Ids are separate from display names and are deliberately not real names. They
are persistence keys, so leave `parkId`, `landId`, and `attractionId` alone once
an entry ships. Renaming one orphans saved progress in `tlc.found.v1`.

Keep new entries consistent with the display names already used for the same
`parkId`, `landId`, and `attractionId`. The build script rejects an entry whose
display names disagree with an existing entry for the same id.

A few locations have no branded name to use and keep a plain descriptive label,
for example "Grand Lobby" or "Entrance Gates". That is fine.

## Coordinates

Coordinates on the current entries were placed by hand from public maps and are
approximate to roughly a building. Tighten them when you can verify on site.

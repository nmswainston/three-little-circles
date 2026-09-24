# Working in this repo

Three Little Circles is an unofficial Hidden Mickey finder built with Expo and
React Native. These notes apply to any assistant or automated session working
here. They complement, and never replace, [README.md](README.md) and
[content/README.md](content/README.md).

## No assistant attribution, anywhere

Nothing in this repository may mention the assistant or tooling that produced
a change. That means:

- No `Co-Authored-By` trailers on commits.
- No "Generated with" lines, session links, or model names in commit messages,
  squash-merge messages, pull request titles, or pull request bodies.
- No attribution footers on pull request comments or reviews.
- No model or tool names in code, comments, content JSON, or docs.

When a tool adds a footer or trailer on its own, remove it before the change
lands. When squash-merging a pull request, pass an explicit commit title and
message rather than accepting the generated default. Rewriting `main` history
to scrub older commits is not on the table; keep new ones clean.

## Real place names

Park, land, and attraction display names use the real names, for example
"Disney's Hollywood Studios" and "Slinky Dog Dash". Ids stay as they are: they
are persistence keys for saved progress, and renaming one orphans a guest's
finds. The full rule is in the naming section of `content/README.md`.

## Content workflow

- Entries are one JSON file each under `content/entries/`. Facts are one JSON
  file each under `content/facts/`. The app only reads the generated files, so
  run `npm run content:build` and commit the generated output with the source.
- The research spreadsheet is the register of candidate finds, and `sourceId`
  links an entry to its row. Import in batches of one park or resort area per
  pull request, rewriting each entry in the app's voice rather than copying the
  sheet text. After the sheet changes, run `npm run content:reconcile` against
  a CSV export of its Master tab and act on the report by hand.
- Do not add placeholder or "lead" entries. An entry needs a scene and an
  exact spot. Unresolved reports stay in the spreadsheet until they do.
- Run `npm run check` before pushing. It runs content validation, the type
  check, and the Jest suite, and it is what CI runs.

## Pull requests

- Develop on a branch, open a draft pull request, and let the owner decide when
  to mark it ready and merge.
- One concern per pull request. Content batches and app changes ship
  separately.
- Squash merge, with a clean message as described above.

# Three Little Circles

An unofficial field guide to Hidden Mickeys and other hidden details in theme
parks and resorts. Browse by park, land, and attraction, read exactly where to
look, mark what you have found, and watch your progress fill in.

This is a fan project. It is not affiliated with or endorsed by any theme park
company. Park, land, and attraction names in the app are descriptive rather than
trademarked.

## Stack

- Expo SDK 57, React Native 0.86, TypeScript 6
- React Navigation (native stack)
- Zustand with AsyncStorage persistence for found state and achievements
- react-native-maps on iOS and Android, list fallback on web
- Jest with jest-expo

## Getting started

```bash
npm install
npm start
```

`npm start` builds the content bundle first, then launches Expo. Press `i` for
the iOS simulator, `a` for an Android emulator, or `w` for the web build, or scan
the QR code with Expo Go.

Copy `.env.example` to `.env` if you need Supabase or a Google Maps key. Neither
is required for local development.

## Project layout

```
content/entries/        One JSON file per Hidden Mickey. This is the source of truth.
content/TEMPLATE.json   Starting point for a new entry.
scripts/build-entries.mjs
                        Validates content and writes src/data/entries.generated.ts.
src/data/               Entry types, query helpers, generated entries.
src/store/              Zustand stores (found state, achievements).
src/screens/            One file per screen. MapScreen.web.tsx replaces the map on web.
src/components/         Shared UI.
src/utils/progress.ts   Progress and completion math.
__tests__/              Jest tests.
```

## Adding content

See [content/README.md](content/README.md). The short version:

1. Copy `content/TEMPLATE.json` to `content/entries/<id>.json`.
2. Fill it in.
3. Run `npm run content:build` and commit both files.

## Checks

```bash
npm run check
```

That runs content validation, the TypeScript type check, and the Jest suite.
Each is also available on its own: `npm run content:check`, `npm run typecheck`,
`npm test`.

## Building for devices

Builds use [EAS Build](https://docs.expo.dev/build/introduction/). One-time setup:

```bash
npm install -g eas-cli
eas login
eas init
```

`eas init` prints a project id. Put it in `.env` as `EAS_PROJECT_ID` so
`app.config.js` can pick it up.

Then:

| Goal | Command |
| --- | --- |
| Internal test build for your own phone | `eas build --profile preview --platform ios` (or `android`) |
| Development client with hot reload | `eas build --profile development --platform ios` |
| Store submission | `eas build --profile production --platform all` then `eas submit` |

Android standalone builds need `GOOGLE_MAPS_ANDROID_API_KEY` set in the EAS
environment for the map to render. iOS uses Apple Maps and needs no key.

## Data and persistence

Found marks are stored on the device under the key `tlc.found.v1` and unlocked
achievements under `tlc.achievements.v1`. Achievements are recalculated from the
found map whenever it changes, and once earned they stay earned even if a find is
un-marked. "Reset found progress" on the Profile screen clears the found map.

The Supabase client in `src/lib/supabase.ts` is initialized when credentials are
present but nothing calls it yet. It is there for future sync and community
submissions.

## Known gaps

- Coordinates on the current entries are approximate to the attraction or
  building and were placed by hand. Verify on site before relying on them.
- Twelve entries ship today. The content pipeline is built so that adding more is
  a JSON file, not a code change.
- `App.tsx` suppresses several web-only console warnings from React Navigation
  and third-party stylesheets. They are cosmetic, but the suppression is a
  workaround rather than a fix.

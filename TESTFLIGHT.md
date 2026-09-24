# TestFlight

The readiness checklist, then paste-ready text for the App Store Connect fields.
Each field's limit is 4000 characters; all of these are well under.

---

## Before the first build

What is already in place, and the steps that only the account owner can do.
The app config answers the questions Apple asks at upload, so none of these
should surprise you at submit time.

**Already handled in the repo**

- Bundle id `com.nmswainston.threelittlecircles`, version `1.0.0`, and EAS
  remote build numbers that increment on every production build.
- Export compliance answered in the build (`ITSAppUsesNonExemptEncryption`
  is false; the app only uses HTTPS), so App Store Connect will not ask.
- Permission strings for location while in use, photo library, and camera,
  each saying why. The "Always" location, motion activity, and microphone
  strings that the Expo plugins add by default are switched off, so the
  Info.plist declares only what the app requests.
- A 1024 px App Store icon with no transparency, which is what the upload
  validator checks, plus adaptive icons and light and dark splash images.
- The privacy policy page in `docs/privacy.html`, which describes the data
  handling accurately as of the date at its top.
- Expo SDK 57 ships the privacy manifest entries for the libraries in use,
  and the app itself calls none of Apple's required-reason APIs directly.

**Do once, before `eas build`**

1. Apple Developer Program membership active, and an app record in App Store
   Connect for the bundle id above. Check the name "Three Little Circles" is
   available when you create the record.
2. EAS environment variables, since `.env` never leaves your machine. Set
   them for `production` and again for `preview`:
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` (plain text; the anon key is public
   by design) and `GOOGLE_MAPS_ANDROID_API_KEY` (sensitive; Android only).
   Without the first two, the build ships with reports and suggestions
   switched off. Each profile in `eas.json` names the environment it loads.
3. Confirm the privacy policy is live: open
   https://nmswainston.github.io/three-little-circles/privacy.html in a
   browser and expect the page, not a 404. GitHub Pages must be serving the
   `docs/` folder from `main`.
4. Run `npm run check` on `main`.

**Build and upload**

```bash
eas build --profile production --platform ios
eas submit --platform ios --latest
```

Then in App Store Connect, under TestFlight: fill Test Information with the
Beta App Description and the fields below, add yourself and any internal
testers (no review needed, up to 100 App Store Connect users), and for
friends outside the team create an external group, which triggers Beta App
Review. Paste the review notes below when it asks.

**Decide before the App Store listing, not before TestFlight**

- iPad. `supportsTablet` is on, so a store submission will require 13-inch
  iPad screenshots. Either take them or switch it off until the layout is
  more than phone-shaped. TestFlight does not care either way.
- Home screen name. "Three Little Circles" is longer than iOS shows under an
  icon, so it will be cut short on the home screen. A shorter
  `CFBundleDisplayName` is a branding call, not a technical one.
- App Privacy answers. Location (precise, app functionality, not linked to
  the user, not used for tracking). Photos and user content (only when a
  sighting is submitted, not linked). Identifiers (the random install id sent
  with submissions and reports; declare it as a device identifier used for
  app functionality, not linked, not tracking). Nothing else is collected.
- Trademarks. The names of real parks and attractions appear as plain text,
  the app ships no logos, characters, or artwork, and the disclaimer is on the
  intro, the Parks screen, and Profile. The review notes below make that case.
  It is the one guideline (5.2.1) where a reviewer might still ask questions.

---

## Beta App Description

*App Store Connect: TestFlight > Test Information > Beta App Description.
This is what testers read in the TestFlight app before installing.*

Three Little Circles is a field guide for finding Hidden Mickeys and the other
details the people who built the parks tucked into murals, props, and
architecture.

Most guides give you a one-line hint, which is not much help when you are
standing in a queue looking at an actual wall. Every entry here is a structured
field note instead: the scene to find first, the exact spot inside it, the angle
to look from, the lighting and crowding to expect, and one best tip. Each entry
also carries a confidence rating, so you know the difference between a sighting
that is well established and one that is a lead.

Tap Found to mark something off. Progress and badges are worked out from your
finds and stay on your phone. There is no account and no sign-in.

This build covers 350 documented finds across Magic Kingdom, EPCOT, Hollywood
Studios, Animal Kingdom, Disney Springs, the Walt Disney World resorts,
Disneyland Park, and Disney California Adventure, plus 19 pieces of park
history and trivia. (Update these numbers for each build; `npm run
content:check` prints the current ones.)

An independent fan project. Not affiliated with, endorsed by, or sponsored by
any theme park company.

---

## What to Test

*App Store Connect: TestFlight > build > What to Test.
Per-build notes. Rewrite this for each build you push.*

First build, so anything you notice is fair game. These are the parts I most
want eyes on:

**From the couch**

- The intro on first launch. Does three screens explain the app, or is it in the
  way? You can replay it from Profile, About, "Show the intro again".
- "Hints one at a time" under Profile, Hunting. With it on, an entry opens its
  directions one step at a time instead of all at once. Does that feel like a
  hunt, or just feel slow?
- Browse a park and try "Hide found" to clear out what you already have.
- Badges on Profile. Five are new: Eagle Eye (5 Hard finds), Queue Master (3
  finds in queues), Surprise Spotter (any Hidden Surprise rather than a Mickey),
  Hot Streak (3 finds in one day), and Coast to Coast (finds in two regions).
  Badges you cannot reach with the content that ships today are meant to stay
  hidden, so tell me if you see one that looks impossible.
- Share progress, from Profile, from a park, or from a single entry.
- Backup, under Profile. It exports your progress as a block of text. Send it to
  yourself, then import it back. This is the only way to move progress between
  phones right now, so I would like to know it survives a round trip.

**In a park, if you are going**

- Whether the directions actually work when you are standing there. This is the
  one that matters most.
- The map's closest-to-you list. Tap locate and it should sort pins by distance,
  and switch parks if you have walked into a different one.
- "Still there?" on each entry. Tap "Saw it today" or "Couldn't find it". Those
  reports drive the "Last seen" line other people see.
- "Suggest a find" if you spot something that is not listed.

**Rough edges I already know about**

- Map pins were placed by hand from satellite view. They are accurate to the
  building, not to the spot.
- Most entries were written up from research and are marked Unverified in the
  content until someone confirms them in person. The confidence rating on each
  entry is the honest guide to how sure we are.
- It runs on iPad, but the layout is still phone-shaped.

Tell me what is confusing before you tell me what is broken. Confusing is the
harder problem.

---

## Beta App Review Notes

*App Store Connect: TestFlight > Test Information > notes for the review team.
Only Apple sees this. It exists to answer the two questions a reviewer will
have before they ask them.*

No account or login is required. Every feature is available immediately on
launch, with no demo credentials needed.

This is an independent, unofficial fan-made guide. It is not affiliated with,
endorsed by, or sponsored by The Walt Disney Company or any other theme park
operator, and it does not represent itself as such. A disclaimer to that effect
appears in the first-run intro, on the main Parks screen, and on the Profile
screen.

The guide names real parks, lands, and attractions because naming them is the
only way it can do its job. Someone holding this app is standing in a particular
queue looking at a particular mural, and an invented or altered location name
would make the directions useless. The names are used descriptively, to identify
the real place being described, and never as branding or as a claim of
association. The app ships no logos, wordmarks, characters, artwork, audio, or
other assets belonging to any park operator. Names appear only as plain text set
in the app's own typeface. Every written entry and every image in the app is
original work.

Privacy policy: https://nmswainston.github.io/three-little-circles/privacy.html

Location is requested only when the user taps the locate button on the Map tab,
is used while the app is open, and is never transmitted. Photo and camera access
is requested only if the user chooses to attach an image to a find they are
suggesting.

---

## The other required fields

| Field | Value |
| --- | --- |
| Feedback email | the address you want tester replies sent to |
| Privacy policy URL | https://nmswainston.github.io/three-little-circles/privacy.html |
| Marketing URL | optional, your GitHub repo works |
| Beta App Review contact | your name, email, and phone |

Screenshots are not needed for TestFlight. They are only required for a full
App Store submission.

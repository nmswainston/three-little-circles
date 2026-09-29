# Google Play

The Android counterpart to [TESTFLIGHT.md](TESTFLIGHT.md): the readiness
checklist, then paste-ready text and answers for the Play Console forms.

---

## Before the first build

**Already handled in the repo**

- Package `com.nmswainston.threelittlecircles`, version `1.0.0`, and EAS
  remote version codes that increment on every production build.
- Adaptive icon with a monochrome layer for themed icons, plus light and dark
  splash images.
- Only the permissions the app uses. Location (fine and coarse, foreground
  only), camera, internet, and vibrate for haptics. Storage read and write are
  capped at Android 12, and on Android 13 and later the image picker uses the
  system photo picker, so the manifest never asks for `READ_MEDIA_IMAGES` and
  Play will not ask for a photo permissions declaration. Microphone and "draw
  over other apps" are removed in `app.config.js`. No background location, no
  foreground service, no advertising id.
- `eas submit` sends production builds to the internal testing track as a
  draft (`eas.json`), which is what Play requires while the app has never been
  reviewed.
- The privacy policy at
  https://nmswainston.github.io/three-little-circles/privacy.html.

**Do once, as the account owner**

1. A Google Play developer account. The $25 fee is one-time, and identity
   verification can take a few days. A personal account needs a closed test
   before production (step 7). An organization account skips that, but it
   needs a registered business and a D-U-N-S number.
2. Create the app in Play Console: name "Three Little Circles", app (not
   game), free. The package name is fixed by the first upload.
3. EAS environment variables for `production`, as in
   [TESTFLIGHT.md](TESTFLIGHT.md). Android also needs
   `GOOGLE_MAPS_ANDROID_API_KEY` or the Map tab is a grey box.
4. Build and upload the first release **by hand**. Google's API cannot create
   an app's first release, so `eas submit` only works from the second one on.

   ```bash
   eas build --profile production --platform android
   ```

   Download the `.aab` from the build page and upload it in Play Console under
   Testing, Internal testing, Create new release. Accept Play App Signing when
   asked.
5. Restrict the Maps key. In Play Console under Setup, App signing, copy the
   **app signing key** SHA-1 and add it to the key's Android restrictions in
   Google Cloud, next to the upload key SHA-1 from `eas credentials`. Skip this
   and the map is grey in every copy installed from Play.
6. For later releases, let EAS submit. In Google Cloud create a service
   account, download its JSON key, and invite its email in Play Console under
   Users and permissions with release rights for this app. Then
   `eas credentials`, Android, production, Google Service Account, and upload
   the key there so it never sits in the repo. After that:

   ```bash
   eas build --profile production --platform android --auto-submit
   ```

7. Closed test. Create a closed testing track, add at least 12 testers by
   email or Google Group, and keep at least 12 of them opted in for 14 days in
   a row. Then Play Console offers "Apply for production", which asks a few
   questions about the test. Internal testing does not count toward the 14
   days.

---

## Store listing

*Play Console: Grow users, Store presence, Main store listing.*

**App name** (30 max)

Three Little Circles

**Short description** (80 max)

Field notes for finding Hidden Mickeys: the scene, the spot, and the angle.

**Full description** (4000 max)

Three Little Circles is a field guide for finding Hidden Mickeys and the other
details the people who built the parks tucked into murals, props, and
architecture.

Most guides give you a one-line hint, which is not much help when you are
standing in a queue looking at an actual wall. Every entry here is a structured
field note instead: the scene to find first, the exact spot inside it, the
angle to look from, the lighting and crowding to expect, and one best tip. Each
entry carries a confidence rating, so you know which sightings are well
established and which still need a second pair of eyes.

What you get:

- 350 entries, 284 Hidden Mickeys and 66 other hidden details, across Magic
  Kingdom, EPCOT, Disney's Hollywood Studios, Disney's Animal Kingdom, Disney
  Springs, the Walt Disney World resorts, Disneyland Park, and Disney
  California Adventure.
- Hints one step at a time, if you would rather hunt than be told.
- A park map with the finds closest to where you are standing.
- Progress for every park, and badges to earn along the way.
- "Still there?" reports, so everyone can see when a find was last seen.
- Suggest a find you spotted that is not in the guide yet.

No account and no sign-in. Your progress stays on your phone, with a text
backup you can export and import. No ads, no analytics, no tracking.

Three Little Circles is an independent fan project. It is not affiliated with,
endorsed by, or sponsored by The Walt Disney Company or any other theme park
operator. Park and attraction names are used only to say where each find is.

*(Update the counts for each release. `npm run content:check` prints them.)*

**Graphics**

| Asset | Size | Notes |
| --- | --- | --- |
| App icon | 512 x 512 PNG | Export from `assets/icon.png` |
| Feature graphic | 1024 x 500 PNG or JPG | Required. The app's own art only, no park logos |
| Phone screenshots | 2 to 8, 16:9 or 9:16 | Take from a real Android build, not the web build in `docs/screenshots` |

Keep park logos, characters, and official artwork out of every image, the same
as in the app.

**Categorization and contact**

| Field | Value |
| --- | --- |
| App category | Travel & Local |
| Tags | Travel guide, Theme parks |
| Email | Shown publicly on the listing. Use an address you are happy to publish |
| Website | https://github.com/nmswainston/three-little-circles |
| Privacy policy | https://nmswainston.github.io/three-little-circles/privacy.html |

---

## App content

*Play Console: Policy, App content. Every item must be complete before any
release goes out, including internal testing.*

**Privacy policy:** the URL above.

**Ads:** No, the app does not contain ads.

**App access:** All functionality is available without special access. No
login, no demo account needed.

**Content rating:** fill in the questionnaire as a Reference, News, or
Educational app. Answer no to violence, sexuality, language, controlled
substances, gambling, and purchases. For "Can users interact or exchange
content?" answer no: suggestions go to a private review queue and nobody else
sees them unless they are published as content. The app shares no location
with other users. Expect Everyone or the local equivalent.

**Target audience:** 13 and older, matching the privacy policy. When asked
whether the app could unintentionally appeal to children, answer no. It is a
text guide with no characters or games.

**News app:** No. **Health apps:** None. **Financial features:** None.
**Government app:** No.

**Advertising ID:** No. Neither the app nor its libraries use it.

**Data safety**

Google, like Apple, only counts data that leaves the phone. Location is read
on the device to place you on the map and is never sent, so it is **not
collected**.

Overview questions:

| Question | Answer |
| --- | --- |
| Does the app collect or share any required user data types? | Yes |
| Is all collected data encrypted in transit? | Yes (HTTPS to Supabase) |
| Which account creation methods does the app support? | None. There is no sign-up or login. The anonymous Supabase session is created by the app, not by the person, and holds no profile |
| Can users request that their data be deleted? | Yes, by email, as the privacy policy says |

Data types collected. For every one: collected, not shared (Supabase stores it
on our behalf as a service provider, which Google does not count as sharing),
not processed ephemerally, optional (only sent when the person chooses to),
and used for **App functionality**. Tick **Fraud prevention, security, and
compliance** as well for Device or other IDs, since the ids also limit spam.

| Category | Type | What it is |
| --- | --- | --- |
| Personal info | Name | Only if the person types one and ticks the credit box on a suggestion |
| Photos and videos | Photos | The photo attached to a suggestion, if any |
| App activity | Other user-generated content | The suggestion text and choices, and each "Still there?" answer |
| Device or other IDs | Device or other IDs | The random install id sent with suggestions, and the anonymous session id used for reports |

Nothing is used for analytics, advertising, personalization, or account
management.

---

## Release notes

*Play Console: the release's "Release notes" box. 500 characters per
language. Rewrite for each release.*

First release. A field guide to 350 Hidden Mickeys and other hidden details,
with step-by-step hints, a park map, badges, and "Still there?" reports.

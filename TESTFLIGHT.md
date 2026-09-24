# TestFlight copy

Paste-ready text for the App Store Connect fields. Each field's limit is 4000
characters; all of these are well under.

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

This build covers 138 documented finds across Magic Kingdom, EPCOT, Hollywood
Studios, Animal Kingdom, Disney Springs, the Walt Disney World resorts,
Disneyland Park, and Disney California Adventure, plus 19 pieces of park
history and trivia.

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
- The resort entries are unconfirmed leads. They say roughly where to look but
  nobody has verified them yet.
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

# Community sightings

Users can suggest a Hidden Mickey from inside the app, or send a photo of one
already in the guide. Both land in the same private Supabase table as
"pending", you review them, and a script turns approved suggestions into draft
content files and approved photos into files ready for `npm run content:photo`.
Nothing a user submits is ever shown in the app until you have approved it,
rewritten or processed it, and shipped it as content.

## One-time setup

1. Create a project at [supabase.com](https://supabase.com). The free tier is fine.
2. Open **SQL Editor**, paste the contents of [`schema.sql`](schema.sql), and run
   it. That creates the table, the private photo bucket, the security policies,
   and a per-device rate limit.
3. Open **Project Settings > API** and copy two values into your local `.env`:

   ```
   SUPABASE_URL=https://<your-project>.supabase.co
   SUPABASE_ANON_KEY=<anon public key>
   ```

   The anon key is safe to ship in the app: the policies in `schema.sql` let it
   insert a pending submission and upload a photo, and nothing else.

   If the project was set up before photos of existing finds existed, run
   `schema.sql` again. It adds the `for_entry_id` column and is safe to re-run.

4. Turn on anonymous sign-ins under **Authentication > Sign In / Providers >
   Anonymous**. "Still there?" reports use them so every report is tied to an
   id the server issued, not one the client picked. No email, password, or
   personal detail is involved. Then bound how many identities one actor can
   mint: lower the anonymous sign-in limit under **Authentication > Rate
   Limits**, and turn on CAPTCHA under **Authentication > Attack Protection**.
   Without those, someone with a script could create users until a freshness
   label reads the way they want.

5. Run `npm run supabase:check`. It confirms both tables exist, that the anon
   key cannot read them, that anonymous sign-ins are on (this creates one
   throwaway anonymous user), and (if the service role key is set) that the
   photo bucket is private. It sends no content.

6. For device builds, add the same two variables to your EAS project
   environment (`eas env:create`, or the Environment variables page on
   expo.dev), otherwise the built app will say submissions aren't set up.

7. For the import script only, also copy the **service role** key into `.env`
   as `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses every policy. It is read by
   the script on your machine and never bundled into the app; `app.config.js`
   does not reference it.

## Reviewing

In the Supabase dashboard, open **Table Editor > submissions** and filter
`status = pending`. Each row has the park, attraction, title, and where-to-look
text, plus `photo_path` if the person attached a photo. Open **Storage >
submission-photos** to view it.

A photo of a find already in the guide has `for_entry_id` set to that entry.
Its title and attraction repeat the entry's, and `where_to_look` holds the
sender's note, or "Photo only" when they left none. Approve it when the photo
clearly shows the find and nothing it should not, such as other guests' faces.

Set `status` to `approved` or `rejected`. `reviewer_notes` is for you. The SQL
at the bottom of `schema.sql` does the same thing from the SQL editor if you
prefer.

## Importing approved sightings

```bash
npm run content:import
```

That fetches approved rows that haven't been imported yet and writes one draft
file per row to `content/inbox/`, shaped like a normal entry with `TODO` markers
on the fields the submitter couldn't know (stable ids, orientation, viewing
conditions). It then stamps `imported_at` on the row so it isn't fetched twice.
Pass `--dry-run` to see what would be written without touching the database.

From there:

1. Open the draft, fill in the `TODO` fields, and rewrite the description in the
   app's voice. Never publish the submitter's text verbatim.
2. Delete the `_submission` block at the bottom. It holds the review details
   (submission id, photo path, and the name to credit if they opted in) and the
   content build rejects unknown fields.
3. Move the file to `content/entries/<id>.json`, where `<id>` matches the `id`
   inside it.
4. Run `npm run content:build` and commit.

Approved photos of existing finds take a shorter path. The script downloads
each one to `content/inbox/photos/` and prints the `npm run content:photo`
command for it, with the entry id filled in and the credit if the sender
opted in. Replace the `--alt` placeholder with what the photo shows and run
it. That resizes the photo, strips its metadata, writes it to
`content/images/`, and fills the entry's `image` field. Commit the entry and
the image together.

`content/inbox/` is ignored by Git on purpose: drafts contain the submitter's
raw text and, if they opted in, their name, and the photos are untouched
originals.

## Abuse and privacy

- The table allows at most 5 submissions per device per hour. The device id is
  a random value generated by the app, not a hardware identifier.
- The form has a hidden field that bots tend to fill in; anything with that
  field set is dropped on the device before it is sent.
- Photos go to a private bucket that only your dashboard login and the service
  role key can read. A photo of a suggested find is never published. A photo
  of an existing find is published only after you have approved it and run it
  through `content:photo`, which strips every scrap of metadata first.
- Names are optional and only stored when the person ticks the credit box.

## Still there? reports

Every entry has two buttons, "Saw it today" and "Couldn't find it". The first
tap signs the install in anonymously; every tap then inserts one row into
`public.confirmations` with the entry id and the status. The server fills in
the voter id from the session, and the insert policy refuses a row that claims
any other id, so a client cannot vote under an id it chose. A client can still
sign in anonymously again, so the anonymous sign-in rate limit and CAPTCHA from
the setup steps are what keep one actor from becoming many. The table allows
at most 30 reports per voter per hour, and nobody but the service role can
read it.

The app never reads the table. Instead:

```bash
npm run confirmations:pull
```

reads the last 90 days with the service role key, keeps one vote per device
per entry (its latest, so a device that said "seen" and later "missing" counts
once, as missing), and writes `src/data/confirmations.generated.ts`. Commit
that file and ship it. The entry screen then shows "Last seen 3 weeks ago", or
"Reported missing 2 days ago" when the most recent vote says it's gone, along
with how many devices said each.

The pull also prints a status review when the votes disagree with the
content. An `Unverified` entry that at least two devices saw, with more
sightings than misses and a sighting as the newest vote, is listed under
"promote": set its `status` to `Current`. An entry expected to be there
that at least two devices couldn't find, with more misses than sightings and
a miss as the newest vote, is listed under "check": go and look, or research
whether it was removed, before changing it to `Removed`. Nothing is changed
for you; edit the entries, run `npm run content:build`, and ship them in a
content pull request of their own.

Pull before each release, or whenever you want the freshness to move. Pass
`--dry-run` to print the summary without writing. `npm run supabase:check`
verifies the table exists and that the anon key cannot read it.

-- Three Little Circles: community sightings
--
-- Run this once in the Supabase SQL editor (Database > SQL Editor > New query).
-- It is safe to run again; every statement is idempotent.
--
-- What it sets up:
--   * public.submissions   one row per suggested find, status pending until you review it
--   * a private storage bucket for optional photos
--   * row-level security so the app can only INSERT a pending row and
--     upload a photo. It cannot read, update, or delete anything.
--   * a per-device rate limit of 5 submissions per hour
--   * public.confirmations  "Still there?" reports, tied to an anonymous
--     Supabase user the server issues (Authentication > Sign In / Providers >
--     Anonymous must be on), so a client cannot vote as many devices

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- where
  park_id         text not null,
  park_name       text not null,
  region          text,
  land_name       text,
  attraction_name text not null,

  -- what
  title           text not null,
  where_to_look   text not null,
  difficulty      text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  location_type   text not null check (location_type in ('Queue', 'Ride', 'Pre-show', 'Outdoor', 'Indoor')),
  photo_path      text,

  -- who (optional)
  contact_name    text,
  credit_ok       boolean not null default false,

  -- client
  device_id       text not null,
  app_version     text,
  platform        text,

  -- review
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes  text,
  reviewed_at     timestamptz,
  imported_at     timestamptz,
  entry_id        text,

  constraint submissions_title_length      check (char_length(title) between 3 and 80),
  constraint submissions_where_length      check (char_length(where_to_look) between 20 and 2000),
  constraint submissions_attraction_length check (char_length(attraction_name) between 2 and 80),
  constraint submissions_land_length       check (land_name is null or char_length(land_name) <= 80),
  constraint submissions_contact_length    check (contact_name is null or char_length(contact_name) <= 60),
  constraint submissions_device_length     check (char_length(device_id) between 8 and 64)
);

create index if not exists submissions_status_created_idx on public.submissions (status, created_at desc);
create index if not exists submissions_device_created_idx on public.submissions (device_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Rate limit: at most 5 submissions per device per hour
-- ---------------------------------------------------------------------------
create or replace function public.enforce_submission_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.submissions
    where device_id = new.device_id
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many submissions from this device. Please try again in an hour.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- The function runs with elevated rights so it can count rows the anon key
-- cannot see. Nobody needs to call it directly (triggers fire without call
-- permission), so keep it off the API.
revoke execute on function public.enforce_submission_rate() from public, anon, authenticated;

drop trigger if exists submissions_rate_limit on public.submissions;
create trigger submissions_rate_limit
  before insert on public.submissions
  for each row execute function public.enforce_submission_rate();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.submissions enable row level security;

-- The app may only add a pending row. It cannot set review fields. Both roles
-- are listed because an install that has signed in anonymously for "Still
-- there?" reports runs as authenticated from then on.
drop policy if exists "anon can submit a pending sighting" on public.submissions;
create policy "anon can submit a pending sighting"
  on public.submissions
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and reviewer_notes is null
    and reviewed_at is null
    and imported_at is null
    and entry_id is null
  );

-- No select, update, or delete policies for anon: the queue is private.
-- You review rows in the dashboard (which uses your own login, not the anon key)
-- and the import script uses the service role key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Photos: private bucket, anon may upload, nobody but you may read
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submission-photos', 'submission-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon can upload submission photos" on storage.objects;
create policy "anon can upload submission photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'submission-photos');

-- ---------------------------------------------------------------------------
-- Review helpers (optional): run these by hand in the SQL editor
-- ---------------------------------------------------------------------------
-- Pending queue, oldest first:
--   select id, created_at, park_name, attraction_name, title, left(where_to_look, 80) as where_to_look, photo_path
--   from public.submissions where status = 'pending' order by created_at;
--
-- Approve one:
--   update public.submissions set status = 'approved', reviewed_at = now() where id = '<id>';
--
-- Reject one with a note to yourself:
--   update public.submissions set status = 'rejected', reviewed_at = now(), reviewer_notes = 'duplicate of exit-bells' where id = '<id>';

-- ---------------------------------------------------------------------------
-- Still there? One row per tap on an entry: "seen" today, or "missing".
--
-- The app signs in anonymously, then inserts. device_id is filled from the
-- session on the server and the policy refuses any other value, so a client
-- cannot vote under an id it chose. It can still mint new anonymous users,
-- so how far one actor can tilt a summary is bounded by the project's
-- anonymous sign-in rate limit and CAPTCHA (see supabase/README.md), not by
-- this schema. `npm run confirmations:pull` reads the last 90 days with the
-- service role key, keeps one vote per device per entry (its latest), and
-- bakes the summary into src/data/confirmations.generated.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.confirmations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  entry_id    text not null,
  status      text not null check (status in ('seen', 'missing')),
  device_id   text not null default auth.uid()::text,
  app_version text,
  platform    text,

  constraint confirmations_entry_length  check (char_length(entry_id) between 1 and 120),
  constraint confirmations_device_length check (char_length(device_id) between 8 and 64)
);

create index if not exists confirmations_entry_created_idx on public.confirmations (entry_id, created_at desc);
create index if not exists confirmations_device_created_idx on public.confirmations (device_id, created_at desc);

-- Rate limit: at most 30 reports per device per hour. Enough for a full day
-- in a park, not enough to flood an entry.
create or replace function public.enforce_confirmation_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from public.confirmations
    where device_id = new.device_id
      and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Too many reports from this device. Please try again in an hour.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_confirmation_rate() from public, anon, authenticated;

drop trigger if exists confirmations_rate_limit on public.confirmations;
create trigger confirmations_rate_limit
  before insert on public.confirmations
  for each row execute function public.enforce_confirmation_rate();

alter table public.confirmations enable row level security;

-- Only a signed-in (anonymous) user may add a row, and only as itself. The
-- plain anon role gets nothing here. No select, update, or delete for anyone
-- but the service role.
drop policy if exists "anon can report a sighting" on public.confirmations;
drop policy if exists "signed-in app can report a sighting" on public.confirmations;
create policy "signed-in app can report a sighting"
  on public.confirmations
  for insert
  to authenticated
  with check (
    status in ('seen', 'missing')
    and device_id = auth.uid()::text
  );

-- By hand, the same summary the pull script computes (one vote per device):
--   select entry_id, status, count(*) as votes, max(created_at) as latest
--   from (
--     select distinct on (entry_id, device_id) entry_id, device_id, status, created_at
--     from public.confirmations
--     where created_at > now() - interval '90 days'
--     order by entry_id, device_id, created_at desc
--   ) latest_per_device
--   group by entry_id, status
--   order by entry_id, status;

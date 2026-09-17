-- Three Little Circles: community sightings
--
-- Run this once in the Supabase SQL editor (Database > SQL Editor > New query).
-- It is safe to run again; every statement is idempotent.
--
-- What it sets up:
--   * public.submissions   one row per suggested find, status pending until you review it
--   * a private storage bucket for optional photos
--   * row-level security so the anon key can only INSERT a pending row and
--     upload a photo. It cannot read, update, or delete anything.
--   * a per-device rate limit of 5 submissions per hour

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

-- The app (anon key) may only add a pending row. It cannot set review fields.
drop policy if exists "anon can submit a pending sighting" on public.submissions;
create policy "anon can submit a pending sighting"
  on public.submissions
  for insert
  to anon
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
  to anon
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

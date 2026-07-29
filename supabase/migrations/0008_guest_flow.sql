-- Guest (pre-signup) flow. A visitor with no account can pull up to 3 garments
-- and run ONE text-only outfit composition before signing up. There is no
-- render for a guest — the hand is paid-only.
--
-- A guest is keyed by a random id in an httpOnly cookie (b27_guest), NOT an
-- auth user: there is no auth.users row for a visitor, so these tables cannot
-- FK to it. All access is service-role only, from the server, scoped by
-- guest_id. RLS is ON with NO policies, so the anon and authenticated keys can
-- never read or write here — the browser never touches these tables directly.
--
-- Anonymous data is short-lived. A scheduled purge (see /api/guest/purge) and
-- the cascade below delete rows and their storage objects older than the TTL,
-- so a visitor who never converts leaves nothing behind.

create table public.guest_garments (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null,
  ip          text,
  photo_path  text not null,
  media_type  text not null default 'image/jpeg',
  analysis    jsonb not null,
  descriptor  text,
  created_at  timestamptz not null default now()
);

create index guest_garments_guest_idx on public.guest_garments (guest_id);
create index guest_garments_created_idx on public.guest_garments (created_at);
create index guest_garments_ip_idx on public.guest_garments (ip, created_at);

alter table public.guest_garments enable row level security;

-- One composition per guest — the unique guest_id enforces the single-shot rule
-- at the database level, not just in the route.
create table public.guest_generations (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null unique,
  ip          text,
  outfits     jsonb not null,
  occasion    text,
  created_at  timestamptz not null default now()
);

create index guest_generations_created_idx on public.guest_generations (created_at);
create index guest_generations_ip_idx on public.guest_generations (ip, created_at);

alter table public.guest_generations enable row level security;

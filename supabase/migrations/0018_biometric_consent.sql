-- Biometric consent (BIPA / GDPR). The base photo and the renders derived from
-- it are biometric information. The base-photo upload and the render flow both
-- require an explicit, VERSIONED consent carrying an 18-or-older attestation
-- before any base photo is stored or any render runs. Bumping the consent text
-- version (in code) forces every user to consent again.
--
-- Append-only audit: a user may read and insert their OWN consent, never update
-- or delete it. The service-role key (enforcement reads, retention job) bypasses
-- RLS. One row per (user, version); re-consent to the same version is a no-op.

create table public.biometric_consent (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  consent_version text not null,
  is_adult        boolean not null,
  ip              text,
  created_at      timestamptz not null default now(),
  unique (user_id, consent_version)
);
create index biometric_consent_user_idx on public.biometric_consent (user_id);

alter table public.biometric_consent enable row level security;

create policy "biometric_consent_select_own" on public.biometric_consent
  for select using (auth.uid() = user_id);
create policy "biometric_consent_insert_own" on public.biometric_consent
  for insert with check (auth.uid() = user_id);
-- No update/delete policies on purpose — the consent trail is immutable.

-- Last-activity marker for the 12-month biometric retention job. Bumped by the
-- core authenticated actions (base upload, render, outfit generation, garment
-- upload). Defaults to now() so existing users are not immediately swept.
alter table public.users
  add column if not exists last_active_at timestamptz not null default now();

create index if not exists users_last_active_idx on public.users (last_active_at);

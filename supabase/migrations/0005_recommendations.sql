-- Shopping recommendations — the brain's gap analysis, stored so a consultation
-- survives a reload without re-spending the call. Each generation replaces the
-- user's set (delete-then-insert), mirroring outfits.
--
-- affiliate_url is the seam for later monetization. It is intentionally never
-- written in BUILD-08 — no brand or affiliate integration is wired yet.

create table public.recommendations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  category      text not null,
  title         text not null,
  look_for      text not null,
  why           text not null,
  price_low     integer,
  price_high    integer,
  search_query  text not null default '',
  priority      integer not null default 0, -- most-unlocking first
  affiliate_url text                         -- reserved; always null for now
);

create index recommendations_user_created_idx
  on public.recommendations (user_id, created_at);

alter table public.recommendations enable row level security;

create policy "recommendations_select_own" on public.recommendations
  for select using (auth.uid() = user_id);
create policy "recommendations_insert_own" on public.recommendations
  for insert with check (auth.uid() = user_id);
create policy "recommendations_delete_own" on public.recommendations
  for delete using (auth.uid() = user_id);

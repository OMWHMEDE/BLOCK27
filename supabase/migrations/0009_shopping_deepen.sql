-- Deepen the shopping consultation to the full brain-skill flow: a budget, a
-- system-level gap audit ranked by leverage, budget-allocated picks, and what's
-- left. The picks stay in `recommendations` — now with an allocated `spend` and
-- a ready-to-shop search URL written into the reserved `affiliate_url` seam (the
-- one-line swap point for real affiliate links later). The consultation frame —
-- budget, remaining, the ranked audit, the closing advice — lives in one session
-- row per user, replaced on each run, mirroring how outfits/recommendations work.

alter table public.recommendations
  add column if not exists spend integer;

create table if not exists public.shopping_sessions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  budget     integer,                               -- null when the user skipped
  spent      integer not null default 0,
  remaining  integer,                               -- null when no budget
  solid      boolean not null default false,
  advice     text    not null default '',
  gaps       jsonb   not null default '[]'::jsonb    -- the ranked system audit
);

alter table public.shopping_sessions enable row level security;

create policy "shopping_sessions_select_own" on public.shopping_sessions
  for select using (auth.uid() = user_id);
create policy "shopping_sessions_insert_own" on public.shopping_sessions
  for insert with check (auth.uid() = user_id);
create policy "shopping_sessions_update_own" on public.shopping_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shopping_sessions_delete_own" on public.shopping_sessions
  for delete using (auth.uid() = user_id);

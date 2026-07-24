-- Render log — one row per successful render. Backs the fair-use quota
-- (3/day, 30/month per user). Failed renders never write a row, so they never
-- count against the user.

create table public.renders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  outfit_id  uuid references public.outfits (id) on delete set null,
  created_at timestamptz not null default now()
);

create index renders_user_created_idx on public.renders (user_id, created_at);

alter table public.renders enable row level security;

create policy "renders_select_own" on public.renders
  for select using (auth.uid() = user_id);
create policy "renders_insert_own" on public.renders
  for insert with check (auth.uid() = user_id);

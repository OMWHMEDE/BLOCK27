-- BLOCK27 — initial schema.
--
-- Row Level Security is ON for every table. A user reads and writes only their
-- own rows. There are no service-role shortcuts in product code; the policies
-- below are the whole access model.

-- ---------------------------------------------------------------------------
-- users
-- One row per account. id equals auth.users.id.
-- ---------------------------------------------------------------------------
create table public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  created_at          timestamptz not null default now(),
  phone               text,
  phone_verified      boolean not null default false,
  free_renders_used   integer not null default 0,
  subscription_status text not null default 'none'
);

-- ---------------------------------------------------------------------------
-- garments
-- One analyzed piece of clothing. The photo is analyzed once (vision) into
-- `analysis`; after that we reason over text forever.
-- ---------------------------------------------------------------------------
create table public.garments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  photo_path    text not null,
  analysis      jsonb,
  status        text not null default 'pending'
                  check (status in ('pending', 'analyzed', 'rejected')),
  reject_reason text
);
create index garments_user_id_idx on public.garments (user_id);

-- ---------------------------------------------------------------------------
-- outfits
-- A styling decision made by the brain, optionally rendered by the hand.
-- ---------------------------------------------------------------------------
create table public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  item_ids    uuid[] not null default '{}',
  reasoning   text not null default '',
  render_path text
);
create index outfits_user_id_idx on public.outfits (user_id);

-- ---------------------------------------------------------------------------
-- style_profile
-- One row per user. What they lean toward, and what they've accepted/rejected.
-- ---------------------------------------------------------------------------
create table public.style_profile (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  leans             text,
  formality_default integer not null default 2,
  accepted          jsonb not null default '[]',
  rejected          jsonb not null default '[]',
  never_worn        jsonb not null default '[]'
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ON everywhere. A user touches only their own rows.
-- ---------------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.garments      enable row level security;
alter table public.outfits       enable row level security;
alter table public.style_profile enable row level security;

-- users: the row's own id is the identity.
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users_delete_own" on public.users
  for delete using (auth.uid() = id);

-- garments
create policy "garments_select_own" on public.garments
  for select using (auth.uid() = user_id);
create policy "garments_insert_own" on public.garments
  for insert with check (auth.uid() = user_id);
create policy "garments_update_own" on public.garments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "garments_delete_own" on public.garments
  for delete using (auth.uid() = user_id);

-- outfits
create policy "outfits_select_own" on public.outfits
  for select using (auth.uid() = user_id);
create policy "outfits_insert_own" on public.outfits
  for insert with check (auth.uid() = user_id);
create policy "outfits_update_own" on public.outfits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outfits_delete_own" on public.outfits
  for delete using (auth.uid() = user_id);

-- style_profile
create policy "style_profile_select_own" on public.style_profile
  for select using (auth.uid() = user_id);
create policy "style_profile_insert_own" on public.style_profile
  for insert with check (auth.uid() = user_id);
create policy "style_profile_update_own" on public.style_profile
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "style_profile_delete_own" on public.style_profile
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Signup: create the users and style_profile rows in one transaction.
-- A trigger on auth.users runs inside the same transaction as the account
-- insert, so an account never exists without its two rows.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id) values (new.id);
  insert into public.style_profile (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage: the user-photos bucket. PRIVATE. This is body photography.
-- No public object URLs, ever. Reads happen only through signed URLs (see
-- src/lib/supabase/storage.ts). Objects are namespaced by user id: the first
-- path segment must equal the owner's uid.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', false)
on conflict (id) do nothing;

create policy "user_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "user_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "user_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "user_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

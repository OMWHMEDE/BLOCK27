-- Moderation audit — the DECISION, never the image. One row per upload check:
-- pass/reject + reason + user id + timestamp. Backs the access-logging
-- obligation for a product that holds body photos.
--
-- No RLS policies on purpose: only the service-role key (which bypasses RLS)
-- writes here, from the server. No user client and no API can read or write it.
-- There is no human- or user-facing surface over this table — by design.

create table public.moderation_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('base', 'garment')),
  decision   text not null check (decision in ('pass', 'reject')),
  reason     text,
  created_at timestamptz not null default now()
);

create index moderation_log_created_idx on public.moderation_log (created_at);

alter table public.moderation_log enable row level security;

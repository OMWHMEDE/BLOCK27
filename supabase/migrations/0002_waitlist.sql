-- BLOCK27 — waitlist.
--
-- Public page collects interested emails before launch. Anyone may add
-- themselves; nobody but the service role may read the list.

create table public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Public (anon + logged-in) may insert. There is deliberately NO select,
-- update, or delete policy, so RLS denies every read to anon and authenticated.
-- The service role bypasses RLS entirely — it is the only thing that can read
-- the list (Supabase dashboard, a server job with the service key). Emails
-- never leave our database.
create policy "waitlist_insert_public" on public.waitlist
  for insert to anon, authenticated
  with check (true);

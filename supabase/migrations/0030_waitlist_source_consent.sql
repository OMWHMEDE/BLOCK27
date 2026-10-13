-- BLOCK27 — waitlist: attribution + real email consent.
--
-- Two new columns on the public waitlist. `source` records which marketing
-- channel sent the signup (captured from a query parameter on the landing and
-- waitlist pages, defaulting to 'direct'), so the list can be read by channel
-- when exported from Supabase. `consent` records that the person agreed, at
-- signup, to receive a launch email — the form copy now says so plainly, so the
-- flag is a real, informed opt-in, not an assumption.
--
-- created_at is untouched (added in 0002). The insert path stays exactly as it
-- was: anon/authenticated may INSERT under waitlist_insert_public, nobody may
-- read. These columns need no new policy — the table-level INSERT grant already
-- covers every column, and there is still no SELECT/UPDATE/DELETE policy, so the
-- list stays closed to everything but the service role.

alter table public.waitlist
  add column if not exists source  text    not null default 'direct',
  add column if not exists consent boolean not null default false;

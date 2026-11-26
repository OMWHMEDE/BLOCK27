-- Pre-launch security fixes.
--
-- 1. public.users: a signed-in user could UPDATE (and INSERT/DELETE) their own
--    row with every column open, including plan_tier, subscription_status and
--    entitlement_source — a free paid plan, straight through the public API with
--    the anon key the app ships. Rows are created by the handle_new_user trigger
--    and deleted by the server (service role), and the only columns the app
--    writes with the user's own token are display_name, language and
--    last_active_at. So: no insert/delete for clients, and update on those three
--    columns only. Billing columns are written by the server alone.
revoke insert, update, delete on public.users from anon, authenticated;
grant update (display_name, language, last_active_at) on public.users to authenticated;

drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_delete_own" on public.users;

-- 2. public.waitlist: anyone could insert rows directly with the anon key,
--    skipping the form — a bot could fill the list with junk before launch.
--    Signups now go through the server action only (service role), which
--    checks the address and limits signups per visitor. ip_hash is a one-way
--    hash of the visitor's IP, kept only for that limit.
drop policy if exists "waitlist_insert_public" on public.waitlist;
revoke insert, update, delete on public.waitlist from anon, authenticated;

alter table public.waitlist add column if not exists ip_hash text;
create index if not exists waitlist_ip_hash_created_idx
  on public.waitlist (ip_hash, created_at);

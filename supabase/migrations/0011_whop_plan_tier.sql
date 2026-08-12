-- Whop payment tiers. The app was binary (subscription_status = none | active).
-- Whop sells four tiers (free/premium/pro/boss), so record which tier a user
-- bought and the Whop membership that granted it. subscription_status stays as
-- the existing paid gate (set to 'active' by the webhook on any paid tier), so
-- nothing that reads it today changes; plan_tier drives per-tier limits.
--
-- Run this in Supabase before enabling the Whop webhook. Idempotent.

alter table public.users
  add column if not exists plan_tier text not null default 'free',
  add column if not exists whop_membership_id text;

alter table public.users
  drop constraint if exists users_plan_tier_check;
alter table public.users
  add constraint users_plan_tier_check
  check (plan_tier in ('free', 'premium', 'pro', 'boss'));

-- The webhook looks a user up by membership id when a cancellation arrives
-- without our metadata; keep that lookup cheap.
create index if not exists users_whop_membership_id_idx
  on public.users (whop_membership_id)
  where whop_membership_id is not null;

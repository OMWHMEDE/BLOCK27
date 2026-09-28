-- 0028: two-tier pricing. Collapse free/premium/pro/boss to free + block27.
--
-- New model (must match src/lib/whop/plans.ts TIERS):
--   free    — 10 pieces ·  5 generations ·  3 shopping consults / month
--   block27 — 150 pieces · 45 generations · 15 shopping consults / month
--             ($9.99/mo or $79.99/yr; billing period does not change the tier)
--
-- Try-on stays off, so there is no render cap here (there never was in 0026).
-- Idempotent. Order matters: migrate rows onto the new tier BEFORE tightening the
-- check constraint, or existing premium/pro/boss rows would violate it.

-- 1. Existing paid users → the single paid tier. subscription_status /
--    entitlement_source / anchors are untouched, so their entitlement stands.
update public.users
  set plan_tier = 'block27'
  where plan_tier in ('premium', 'pro', 'boss');

-- 2. The plan_tier check constraint now allows only the two live tiers.
alter table public.users
  drop constraint if exists users_plan_tier_check;
alter table public.users
  add constraint users_plan_tier_check
  check (plan_tier in ('free', 'block27'));

-- 3. The cap functions from 0026, updated for the new tiers. plan_tier_of maps the
--    stored value to a live tier (legacy paid values collapse to block27, matching
--    toTier in the app); plan_cap holds the new numbers.
create or replace function public.plan_tier_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case (select plan_tier from public.users where id = p_user_id)
           when 'block27' then 'block27'
           when 'premium' then 'block27'
           when 'pro'     then 'block27'
           when 'boss'    then 'block27'
           else 'free'
         end;
$$;

create or replace function public.plan_cap(p_kind text, p_tier text)
returns integer
language sql
immutable
as $$
  select case p_kind
    when 'composition' then case p_tier when 'block27' then 45  else 5  end
    when 'pieces'      then case p_tier when 'block27' then 150 else 10 end
    when 'shopping'    then case p_tier when 'block27' then 15  else 3  end
  end;
$$;

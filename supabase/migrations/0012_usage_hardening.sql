-- Usage hardening — atomic per-tier monthly counters + a billing-anchored window.
--
-- Closes the launch revenue-leak vectors:
--   - The try-on cap is now RESERVED ATOMICALLY before the paid render, via
--     reserve_usage() — a single conditional UPSERT — so concurrent requests can
--     never exceed the tier's cap. A failed render calls release_usage() to
--     refund the slot, so a failure never burns the user's quota.
--   - Outfit compositions and shopping consultations get the same per-tier
--     monthly caps (they were previously unmetered server-side).
--   - The window is anchored to each user's plan_anchor_at (purchase time), not
--     the calendar month, so nobody gets a free allowance at the month boundary.
--     plan_anchor_at falls back to users.created_at in application code.
--
-- Apply this in Supabase BEFORE deploying the code. The money path fails CLOSED
-- when reserve_usage is absent: the render route denies rather than leaks.
-- Idempotent.

-- 1. Purchase-time anchor for the rolling window. Set by the Whop webhook on the
--    first grant, cleared on revoke so a re-subscribe re-anchors. NULL falls back
--    to users.created_at in application code.
alter table public.users
  add column if not exists plan_anchor_at timestamptz;

-- 2. The counters. One row per (user, kind, window); `used` is the reserved count
--    for that window. period_start is computed in app code from the user's
--    anchor. Rows for elapsed windows are harmless and can be swept later.
create table if not exists public.usage_counters (
  user_id      uuid not null references auth.users (id) on delete cascade,
  kind         text not null,
  period_start timestamptz not null,
  used         integer not null default 0,
  primary key (user_id, kind, period_start)
);

alter table public.usage_counters
  drop constraint if exists usage_counters_kind_check;
alter table public.usage_counters
  add constraint usage_counters_kind_check
  check (kind in ('render', 'composition', 'shopping'));

alter table public.usage_counters enable row level security;

-- Read-only to the owner (for settings display). Every WRITE goes through the
-- SECURITY DEFINER functions below — there is no insert/update policy, so a
-- client can never bump its own counter directly.
drop policy if exists "usage_counters_select_own" on public.usage_counters;
create policy "usage_counters_select_own" on public.usage_counters
  for select using (auth.uid() = user_id);

-- 3. Atomic reserve. Returns true when a slot was taken (used < cap), false at
--    the cap. The conditional ON CONFLICT ... WHERE is one atomic statement, so N
--    concurrent callers can never exceed the cap. The user id comes from
--    auth.uid(), never a parameter, so a caller can only spend their own quota.
create or replace function public.reserve_usage(
  p_kind         text,
  p_period_start timestamptz,
  p_cap          integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_used integer;
begin
  if v_uid is null then
    return false;
  end if;
  -- A zero/negative cap never grants a slot. Guard before the insert, since a
  -- first-ever insert would otherwise write used = 1 against a 0 cap.
  if p_cap is null or p_cap <= 0 then
    return false;
  end if;

  insert into public.usage_counters (user_id, kind, period_start, used)
  values (v_uid, p_kind, p_period_start, 1)
  on conflict (user_id, kind, period_start)
  do update set used = usage_counters.used + 1
    where usage_counters.used < p_cap
  returning used into v_used;

  return v_used is not null;
end;
$$;

-- 4. Release one slot — the refund path when a reserved operation fails. Floors
--    at zero, so a double-release can't drive the counter negative.
create or replace function public.release_usage(
  p_kind         text,
  p_period_start timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  update public.usage_counters
    set used = used - 1
    where user_id = v_uid
      and kind = p_kind
      and period_start = p_period_start
      and used > 0;
end;
$$;

-- Only signed-in users may reserve/release, and only against their own id
-- (enforced by auth.uid() inside the functions).
revoke all on function public.reserve_usage(text, timestamptz, integer) from public;
revoke all on function public.release_usage(text, timestamptz) from public;
grant execute on function public.reserve_usage(text, timestamptz, integer) to authenticated;
grant execute on function public.release_usage(text, timestamptz) to authenticated;

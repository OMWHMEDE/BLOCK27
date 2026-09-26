-- Make reserve_usage a HARD cap. Symptom in production: a free account reached
-- composition used = 14 against a cap of 10 — the counter incremented but the cap
-- never blocked, so generation (and, by the same function, try-ons and shopping)
-- ran past the limit. reserve_usage is the single gate for all three metered
-- operations; every route already refuses when it returns false, so the fault is
-- the function not returning false at the cap. (The repo's 0012 body looks
-- correct, but the deployed one clearly isn't — a stale/earlier version. This
-- re-creates it so applying this migration replaces whatever is live.)
--
-- Rewritten in the least ambiguous form: ensure the row exists at 0, then
-- increment ONLY while under the cap, and report whether that increment happened.
-- The UPDATE's WHERE is the whole enforcement — if used >= cap, zero rows change
-- and we return false. `used` can therefore never exceed the cap.
--
-- Boundary (cap = N): the 1st..Nth calls return true (used climbs 1..N); the
-- (N+1)th and beyond return false; `used` tops out at exactly N. Idempotent;
-- create-or-replace preserves existing grants, and they are re-asserted below.

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
  v_rows integer;
begin
  -- Only a signed-in user spends their own quota; the id is never a parameter.
  if v_uid is null then
    return false;
  end if;
  -- A null/zero/negative cap grants nothing.
  if p_cap is null or p_cap <= 0 then
    return false;
  end if;

  -- Ensure the counter row exists at 0 (no-op if it already does). This never
  -- increments, so it can't overshoot on its own.
  insert into public.usage_counters (user_id, kind, period_start, used)
  values (v_uid, p_kind, p_period_start, 0)
  on conflict (user_id, kind, period_start) do nothing;

  -- The hard cap: increment iff still under it. If used >= cap, zero rows update.
  update public.usage_counters
    set used = used + 1
  where user_id = v_uid
    and kind = p_kind
    and period_start = p_period_start
    and used < p_cap;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

-- Owner-only execution (create-or-replace keeps existing grants; re-assert to be
-- certain after the redefinition).
revoke all on function public.reserve_usage(text, timestamptz, integer) from public;
grant execute on function public.reserve_usage(text, timestamptz, integer) to authenticated;

-- Boundary test for reserve_usage (run in the Supabase SQL editor AFTER applying
-- migration 0024). Proves the cap blocks exactly at the boundary and the counter
-- never exceeds it. Wrapped in a transaction that ROLLS BACK, so it leaves no
-- trace and touches no real usage.
--
-- HOW TO RUN: replace <REAL-USER-UUID> with the id of any real account (it must
-- exist in auth.users — usage_counters.user_id references it), then run the whole
-- block. reserve_usage reads auth.uid() from the JWT claims; set_config fakes that
-- for the test. Expected results are in the comments.
--
-- Repeat with p_kind = 'render' and 'shopping' to prove those caps too — they use
-- the exact same function, only the cap differs (try-ons / consultations).

begin;

-- Make auth.uid() return the test user for this transaction.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '<REAL-USER-UUID>')::text,
  true
);

-- Clean slate for this (user, kind, window) so the test starts at 0.
delete from public.usage_counters
where user_id = '<REAL-USER-UUID>'
  and kind = 'composition'
  and period_start = timestamptz '2099-01-01T00:00:00Z';

-- Cap of 3: the first three reserve, the fourth and fifth are refused.
select public.reserve_usage('composition', timestamptz '2099-01-01T00:00:00Z', 3) as call_1;  -- expect: true
select public.reserve_usage('composition', timestamptz '2099-01-01T00:00:00Z', 3) as call_2;  -- expect: true
select public.reserve_usage('composition', timestamptz '2099-01-01T00:00:00Z', 3) as call_3;  -- expect: true
select public.reserve_usage('composition', timestamptz '2099-01-01T00:00:00Z', 3) as call_4;  -- expect: FALSE
select public.reserve_usage('composition', timestamptz '2099-01-01T00:00:00Z', 3) as call_5;  -- expect: FALSE

-- The counter must read exactly 3 — never 4, never 5.
select used as final_used
from public.usage_counters
where user_id = '<REAL-USER-UUID>'
  and kind = 'composition'
  and period_start = timestamptz '2099-01-01T00:00:00Z';  -- expect: 3

rollback;  -- undoes everything above; no real data changed

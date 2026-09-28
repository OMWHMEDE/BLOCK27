-- 0026: cap enforcement in the database — the one layer no path can bypass.
--
-- Route-level checks kept slipping because the outfit worker reaches the tables
-- through the service-role client and via recovery re-kicks that don't pass the
-- request path. Postgres triggers fire for EVERY insert regardless of role
-- (authenticated user, service role, or a background worker), so enforcing here
-- is the guarantee: pieces (garments), generations (outfits) and shopping
-- consultations (shopping_sessions) cannot exceed the tier cap, whatever code
-- does the insert.
--
-- Two problems the artifact tables can't solve on their own, handled below:
--   * outfits streams ~5 rows per generation and swap_outfit_generation DELETES
--     the old generations, so the table holds no per-cycle history and its row
--     count is not a generation count. A durable generation_ledger records one
--     row per generation (deduped by (user, generation)) and survives the swap.
--   * shopping_sessions is one row per user, replaced each run, so it can't be
--     counted over a cycle either. A durable consultation_ledger records one row
--     per consultation.
-- garments persist one row per owned piece, so that cap is a live count of the
-- table itself — no ledger needed.
--
-- Caps (must match src/lib/whop/plans.ts TIERS):
--   generations  free 10  · premium 30 · pro 60  · boss 150
--   pieces       free 15  · premium 30 · pro 60  · boss 100
--   shopping     free 10  · premium 60 · pro 120 · boss 200
--
-- Idempotent. Apply in the Supabase SQL editor.

-- ── Exemption list (mirror of PAID_OVERRIDE_UIDS) ───────────────────────────────
-- The database can't read the app's env, so the override allowlist is mirrored
-- here. Add every id in PAID_OVERRIDE_UIDS to this table so test accounts stay
-- uncapped; remove them to re-cap. RLS on, no policies — only the SECURITY DEFINER
-- trigger functions (and the service role) ever read it.
create table if not exists public.plan_cap_exempt (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.plan_cap_exempt enable row level security;

-- ── Durable ledgers ─────────────────────────────────────────────────────────────
-- One row per generation, append-only, keyed so a resumed/re-streamed generation
-- is counted exactly once. Outlives the outfits swap-delete.
create table if not exists public.generation_ledger (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  generation bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, generation)
);
create index if not exists generation_ledger_user_created_idx
  on public.generation_ledger (user_id, created_at);
alter table public.generation_ledger enable row level security;

-- One row per shopping consultation, append-only.
create table if not exists public.consultation_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists consultation_ledger_user_created_idx
  on public.consultation_ledger (user_id, created_at);
alter table public.consultation_ledger enable row level security;

-- ── Billing-anchored window start (ports usageWindowStart, src/lib/plan.ts) ──────
-- The most recent monthly anniversary of the plan anchor (falling back to account
-- creation) at or before now, in UTC, with the day clamped for short months.
create or replace function public.usage_window_start(p_user_id uuid)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_anchor timestamptz;
  v_now    timestamptz := now();
  ad int; hh int; mi int; ss double precision;
  yr int; mo int; last_day int;
  cand timestamptz;
begin
  select coalesce(plan_anchor_at, created_at) into v_anchor
    from public.users where id = p_user_id;
  v_anchor := coalesce(v_anchor, v_now);

  ad := extract(day    from (v_anchor at time zone 'UTC'))::int;
  hh := extract(hour   from (v_anchor at time zone 'UTC'))::int;
  mi := extract(minute from (v_anchor at time zone 'UTC'))::int;
  ss := extract(second from (v_anchor at time zone 'UTC'));

  yr := extract(year  from (v_now at time zone 'UTC'))::int;
  mo := extract(month from (v_now at time zone 'UTC'))::int;

  last_day := extract(day from (
    date_trunc('month', make_timestamp(yr, mo, 1, 0, 0, 0)) + interval '1 month - 1 day'
  ))::int;
  cand := make_timestamptz(yr, mo, least(ad, last_day), hh, mi, ss, 'UTC');

  if cand > v_now then
    if mo = 1 then yr := yr - 1; mo := 12; else mo := mo - 1; end if;
    last_day := extract(day from (
      date_trunc('month', make_timestamp(yr, mo, 1, 0, 0, 0)) + interval '1 month - 1 day'
    ))::int;
    cand := make_timestamptz(yr, mo, least(ad, last_day), hh, mi, ss, 'UTC');
  end if;

  return cand;
end;
$$;

-- ── Tier + cap helpers ──────────────────────────────────────────────────────────
-- Mirrors toTier: only the four known values count; anything else is free.
create or replace function public.plan_tier_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case (select plan_tier from public.users where id = p_user_id)
           when 'premium' then 'premium'
           when 'pro'     then 'pro'
           when 'boss'    then 'boss'
           else 'free'
         end;
$$;

create or replace function public.plan_cap(p_kind text, p_tier text)
returns integer
language sql
immutable
as $$
  select case p_kind
    when 'composition' then case p_tier when 'premium' then 30 when 'pro' then 60  when 'boss' then 150 else 10 end
    when 'pieces'      then case p_tier when 'premium' then 30 when 'pro' then 60  when 'boss' then 100 else 15 end
    when 'shopping'    then case p_tier when 'premium' then 60 when 'pro' then 120 when 'boss' then 200 else 10 end
  end;
$$;

create or replace function public.is_cap_exempt(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.plan_cap_exempt where user_id = p_user_id);
$$;

-- The refusal every trigger raises. Message is machine-readable — the app parses
-- "BLOCK27_CAP:<kind>:<cap>" to show the localized limit line, not a raw error.
-- (Not a SQL function — inlined per trigger so the raise carries the right kind.)

-- ── Garments: live piece count ──────────────────────────────────────────────────
create or replace function public.enforce_garment_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_cap int; v_used int;
begin
  if public.is_cap_exempt(NEW.user_id) then return NEW; end if;
  v_cap := public.plan_cap('pieces', public.plan_tier_of(NEW.user_id));
  select count(*) into v_used from public.garments where user_id = NEW.user_id;
  if v_used >= v_cap then
    raise exception 'BLOCK27_CAP:pieces:%', v_cap using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists garments_cap on public.garments;
create trigger garments_cap
  before insert on public.garments
  for each row execute function public.enforce_garment_cap();

-- ── Outfits: per-cycle generation cap, via the ledger ────────────────────────────
create or replace function public.enforce_generation_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_cap int; v_used int; v_win timestamptz;
begin
  if public.is_cap_exempt(NEW.user_id) then return NEW; end if;

  -- Already counted (a later streamed row of this generation, or a resume)? Allow.
  if exists (
    select 1 from public.generation_ledger
    where user_id = NEW.user_id and generation = NEW.generation
  ) then
    return NEW;
  end if;

  v_cap := public.plan_cap('composition', public.plan_tier_of(NEW.user_id));
  v_win := public.usage_window_start(NEW.user_id);
  select count(*) into v_used from public.generation_ledger
    where user_id = NEW.user_id and created_at >= v_win;
  if v_used >= v_cap then
    raise exception 'BLOCK27_CAP:composition:%', v_cap using errcode = 'P0001';
  end if;

  insert into public.generation_ledger (user_id, generation)
    values (NEW.user_id, NEW.generation);
  return NEW;
end;
$$;

drop trigger if exists outfits_cap on public.outfits;
create trigger outfits_cap
  before insert on public.outfits
  for each row execute function public.enforce_generation_cap();

-- ── Shopping: per-cycle consultation cap ─────────────────────────────────────────
-- shopping_sessions gets exactly one insert per consultation (the handler deletes
-- then inserts), so this fires once per consultation.
create or replace function public.enforce_shopping_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_cap int; v_used int; v_win timestamptz;
begin
  if public.is_cap_exempt(NEW.user_id) then return NEW; end if;
  v_cap := public.plan_cap('shopping', public.plan_tier_of(NEW.user_id));
  v_win := public.usage_window_start(NEW.user_id);
  select count(*) into v_used from public.consultation_ledger
    where user_id = NEW.user_id and created_at >= v_win;
  if v_used >= v_cap then
    raise exception 'BLOCK27_CAP:shopping:%', v_cap using errcode = 'P0001';
  end if;

  insert into public.consultation_ledger (user_id) values (NEW.user_id);
  return NEW;
end;
$$;

drop trigger if exists shopping_sessions_cap on public.shopping_sessions;
create trigger shopping_sessions_cap
  before insert on public.shopping_sessions
  for each row execute function public.enforce_shopping_cap();

-- ── Grants ───────────────────────────────────────────────────────────────────────
revoke all on function public.usage_window_start(uuid) from public;
revoke all on function public.plan_tier_of(uuid)       from public;
revoke all on function public.is_cap_exempt(uuid)      from public;
grant execute on function public.usage_window_start(uuid) to service_role, authenticated;
grant execute on function public.plan_tier_of(uuid)       to service_role, authenticated;
grant execute on function public.is_cap_exempt(uuid)      to service_role, authenticated;

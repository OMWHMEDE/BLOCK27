-- 0031: lower the BLOCK27 caps, and let the founder hand one user extra room.
--
-- New caps (must match src/lib/whop/plans.ts TIERS):
--   free    — 10 pieces ·  5 generations ·  3 shopping consults / month (unchanged)
--   block27 — 90 pieces · 35 generations · 15 shopping consults / month
--
-- Grants: when someone hits a limit and writes to support, HMEDE can give that one
-- account more. Run in the Supabase SQL editor, e.g.
--   select public.grant_extra('someone@email.com', 'pieces', 20);
--   select public.grant_extra('someone@email.com', 'outfits', 5);
--   select public.grant_extra('someone@email.com', 'shop', 3);
-- Extra pieces are permanent (wardrobe room). Extra outfits / shop consults count
-- for the user's CURRENT monthly window only, then expire with it.
--
-- Users whose wardrobe is already above 90 keep every piece they have; they just
-- can't add more until they're under the cap (or get a grant).
--
-- Idempotent. Apply in the Supabase SQL editor.

-- 1. The new numbers.
create or replace function public.plan_cap(p_kind text, p_tier text)
returns integer
language sql
immutable
as $$
  select case p_kind
    when 'composition' then case p_tier when 'block27' then 35 else 5  end
    when 'pieces'      then case p_tier when 'block27' then 90 else 10 end
    when 'shopping'    then case p_tier when 'block27' then 15 else 3  end
  end;
$$;

-- 2. The grants ledger. Append-only, one row per grant, so there's a record of
--    who got what and when. RLS on with no policies: only the security-definer
--    functions below (and the service role) read it.
create table if not exists public.cap_grants (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('pieces', 'composition', 'shopping')),
  amount     integer not null check (amount > 0),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists cap_grants_user_kind_idx
  on public.cap_grants (user_id, kind, created_at);
alter table public.cap_grants enable row level security;

-- 3. How much extra a user has for a kind right now. Pieces: every grant ever.
--    Composition / shopping: grants made inside the current usage window.
--    A signed-in user can only ask about themselves; the service role and the
--    cap triggers (auth.uid() null, or the row's own user) can ask about anyone.
create or replace function public.cap_bonus(p_user_id uuid, p_kind text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_total int;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    return 0;
  end if;
  if p_kind = 'pieces' then
    select coalesce(sum(amount), 0) into v_total
      from public.cap_grants
      where user_id = p_user_id and kind = 'pieces';
  else
    select coalesce(sum(amount), 0) into v_total
      from public.cap_grants
      where user_id = p_user_id and kind = p_kind
        and created_at >= public.usage_window_start(p_user_id);
  end if;
  return v_total;
end;
$$;

-- 4. The cap triggers from 0026, now cap + bonus.
create or replace function public.enforce_garment_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_cap int; v_used int;
begin
  if public.is_cap_exempt(NEW.user_id) then return NEW; end if;
  v_cap := public.plan_cap('pieces', public.plan_tier_of(NEW.user_id))
         + public.cap_bonus(NEW.user_id, 'pieces');
  select count(*) into v_used from public.garments where user_id = NEW.user_id;
  if v_used >= v_cap then
    raise exception 'BLOCK27_CAP:pieces:%', v_cap using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

create or replace function public.enforce_generation_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_cap int; v_used int; v_win timestamptz;
begin
  if public.is_cap_exempt(NEW.user_id) then return NEW; end if;

  if exists (
    select 1 from public.generation_ledger
    where user_id = NEW.user_id and generation = NEW.generation
  ) then
    return NEW;
  end if;

  v_cap := public.plan_cap('composition', public.plan_tier_of(NEW.user_id))
         + public.cap_bonus(NEW.user_id, 'composition');
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

create or replace function public.enforce_shopping_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_cap int; v_used int; v_win timestamptz;
begin
  if public.is_cap_exempt(NEW.user_id) then return NEW; end if;
  v_cap := public.plan_cap('shopping', public.plan_tier_of(NEW.user_id))
         + public.cap_bonus(NEW.user_id, 'shopping');
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

-- 5. The founder's tool. Looks the account up by email, records the grant, and
--    says what it did. Friendly kind names: pieces / outfits / shop.
--    Not callable from the app — SQL editor (postgres) or service role only.
create or replace function public.grant_extra(
  p_email  text,
  p_kind   text,
  p_amount integer,
  p_note   text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_user uuid; v_kind text;
begin
  v_kind := case lower(trim(p_kind))
    when 'pieces'      then 'pieces'
    when 'piece'       then 'pieces'
    when 'outfits'     then 'composition'
    when 'outfit'      then 'composition'
    when 'generations' then 'composition'
    when 'composition' then 'composition'
    when 'shop'        then 'shopping'
    when 'shopping'    then 'shopping'
    when 'consults'    then 'shopping'
    else null
  end;
  if v_kind is null then
    raise exception 'kind must be pieces, outfits or shop';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be more than 0';
  end if;

  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'no account with email %', p_email;
  end if;

  insert into public.cap_grants (user_id, kind, amount, note)
    values (v_user, v_kind, p_amount, p_note);

  return format('gave %s %s extra %s', p_email, p_amount,
    case v_kind when 'composition' then 'outfits (this month)'
                when 'shopping' then 'shop consults (this month)'
                else 'pieces' end);
end;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────────
revoke all on function public.cap_bonus(uuid, text) from public;
grant execute on function public.cap_bonus(uuid, text) to service_role, authenticated;

revoke all on function public.grant_extra(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.grant_extra(text, text, integer, text) to service_role;

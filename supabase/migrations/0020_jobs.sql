-- Background jobs — the durable queue behind async garment/outfit/render work.
--
-- A job row IS the queue. An enqueue endpoint reserves quota, writes a 'queued'
-- row and returns immediately; a worker claims it (atomic 'queued' -> 'processing'
-- with a lease), does the long call, and marks it done/failed; a scheduled drain
-- reaps anything a dead worker abandoned so a stalled job never leaks a reserved
-- quota slot. This migration lays the table and the lifecycle functions only —
-- no operation is wired onto it yet.
--
-- All writes go through SECURITY DEFINER functions (owner-scoped enqueue) or the
-- service role (workers, drain). Clients get read-only access to their own rows.
-- Idempotent.

create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  kind            text not null,
  status          text not null default 'queued',
  attempts        integer not null default 0,
  max_attempts    integer not null default 3,
  payload         jsonb not null default '{}'::jsonb,
  result          jsonb,
  error           text,
  timings         jsonb not null default '{}'::jsonb,
  -- Quota-refund coordinates. When set, a terminal failure refunds one slot of
  -- (user_id, reserved_kind, reserved_period) in usage_counters — so a job that
  -- fails in the background never burns the user's allowance, exactly like the
  -- synchronous release path does today.
  reserved_kind   text,
  reserved_period timestamptz,
  -- Worker lease. Stamped on claim; a claim only succeeds on a 'queued' row or a
  -- 'processing' row whose lease has expired (its worker died), so a job is never
  -- worked by two workers at once and a dead worker's job becomes reclaimable.
  lease_until     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.jobs drop constraint if exists jobs_status_check;
alter table public.jobs add constraint jobs_status_check
  check (status in ('queued', 'processing', 'done', 'failed'));

-- Job kinds mirror the metered operations. reserved_kind maps to usage_counters
-- kinds. Extend both with a follow-up migration (drop/add) when a new kind lands.
alter table public.jobs drop constraint if exists jobs_kind_check;
alter table public.jobs add constraint jobs_kind_check
  check (kind in ('render', 'composition', 'shopping'));

alter table public.jobs drop constraint if exists jobs_reserved_kind_check;
alter table public.jobs add constraint jobs_reserved_kind_check
  check (reserved_kind is null or reserved_kind in ('render', 'composition', 'shopping'));

create index if not exists jobs_user_idx on public.jobs (user_id);
create index if not exists jobs_status_created_idx on public.jobs (status, created_at);

alter table public.jobs enable row level security;

-- Read-only to the owner (for a status poll / a settings view). Every WRITE goes
-- through the functions below or the service role — no insert/update/delete policy
-- exists, so a client can never move its own job through the pipeline by hand.
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);

-- ── Enqueue (authenticated, owner-scoped) ──────────────────────────────────────
-- The user id comes from auth.uid(), never a parameter, so a caller can only
-- enqueue work for themselves. Returns the new job id.
create or replace function public.enqueue_job(
  p_kind            text,
  p_payload         jsonb,
  p_reserved_kind   text,
  p_reserved_period timestamptz,
  p_max_attempts    integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.jobs (
    user_id, kind, payload, reserved_kind, reserved_period, max_attempts
  ) values (
    v_uid,
    p_kind,
    coalesce(p_payload, '{}'::jsonb),
    p_reserved_kind,
    p_reserved_period,
    greatest(coalesce(p_max_attempts, 3), 1)
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Service-role quota release ─────────────────────────────────────────────────
-- release_usage() reads auth.uid(), which a background worker (service role) does
-- not have. This is the admin refund, keyed by an explicit user id. Floors at
-- zero, so a double release can't drive a counter negative.
create or replace function public.release_usage_admin(
  p_user_id      uuid,
  p_kind         text,
  p_period_start timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usage_counters
    set used = used - 1
  where user_id = p_user_id
    and kind = p_kind
    and period_start = p_period_start
    and used > 0;
end;
$$;

-- ── Claim (service role) ───────────────────────────────────────────────────────
-- Atomic 'queued' -> 'processing', or a reclaim of a 'processing' row whose lease
-- has expired. Bumps attempts and stamps a fresh lease in one statement, so N
-- workers racing the same job can never both win. Returns the claimed row; a NULL
-- row (null id) means nothing was claimable.
create or replace function public.claim_job(
  p_id            uuid,
  p_lease_seconds integer
) returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set status      = 'processing',
        attempts    = attempts + 1,
        lease_until = now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 300), 1)),
        updated_at  = now()
  where id = p_id
    and (
      status = 'queued'
      or (status = 'processing' and lease_until is not null and lease_until < now())
    )
  returning * into v_job;
  return v_job;
end;
$$;

-- ── Complete (service role) ────────────────────────────────────────────────────
create or replace function public.complete_job(
  p_id      uuid,
  p_result  jsonb,
  p_timings jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.jobs
    set status      = 'done',
        result      = p_result,
        timings     = coalesce(p_timings, timings),
        error       = null,
        lease_until = null,
        updated_at  = now()
  where id = p_id
    and status = 'processing';
end;
$$;

-- ── Fail (service role) ────────────────────────────────────────────────────────
-- Requeue for another attempt when p_requeue and attempts remain; otherwise a
-- terminal failure that refunds the reserved quota slot exactly once. Idempotent:
-- a job already 'failed'/'done' is left untouched and never double-refunded.
-- Returns 'requeued' | 'failed' | 'done' | 'missing'.
create or replace function public.fail_job(
  p_id      uuid,
  p_error   text,
  p_requeue boolean
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
begin
  select * into v_job from public.jobs where id = p_id;
  if not found then
    return 'missing';
  end if;
  if v_job.status = 'failed' then
    return 'failed';
  end if;
  if v_job.status = 'done' then
    return 'done';
  end if;

  if p_requeue and v_job.attempts < v_job.max_attempts then
    update public.jobs
      set status = 'queued', error = p_error, lease_until = null, updated_at = now()
    where id = p_id;
    return 'requeued';
  end if;

  if v_job.reserved_kind is not null and v_job.reserved_period is not null then
    perform public.release_usage_admin(
      v_job.user_id, v_job.reserved_kind, v_job.reserved_period
    );
  end if;
  update public.jobs
    set status = 'failed', error = p_error, lease_until = null, updated_at = now()
  where id = p_id;
  return 'failed';
end;
$$;

-- ── Reap (service role) ────────────────────────────────────────────────────────
-- The scheduled drain's core. Two passes:
--   1. Requeue jobs whose worker lease expired but that still have attempts left,
--      so a later kick/poll can pick them up.
--   2. Terminally fail the truly dead — an expired lease with no attempts left, or
--      anything stuck past the hard max age — refunding each one's quota slot.
-- Returns {"requeued": n, "failed": n}. Set-based requeue; the terminal pass loops
-- because the refund is per (user, kind, period).
create or replace function public.reap_jobs(
  p_max_age_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requeued integer := 0;
  v_failed   integer := 0;
  r          public.jobs;
begin
  update public.jobs
    set status = 'queued', lease_until = null, updated_at = now()
  where status = 'processing'
    and lease_until is not null
    and lease_until < now()
    and attempts < max_attempts;
  get diagnostics v_requeued = row_count;

  for r in
    select * from public.jobs
    where status in ('queued', 'processing')
      and (
        (status = 'processing' and lease_until is not null and lease_until < now()
          and attempts >= max_attempts)
        or created_at < now() - make_interval(secs => greatest(coalesce(p_max_age_seconds, 86400), 60))
      )
  loop
    if r.reserved_kind is not null and r.reserved_period is not null then
      perform public.release_usage_admin(r.user_id, r.reserved_kind, r.reserved_period);
    end if;
    update public.jobs
      set status      = 'failed',
          error       = coalesce(r.error, 'reaped: exceeded retries or max age'),
          lease_until = null,
          updated_at  = now()
    where id = r.id;
    v_failed := v_failed + 1;
  end loop;

  return jsonb_build_object('requeued', v_requeued, 'failed', v_failed);
end;
$$;

-- Grants. Only the owner may enqueue (via auth.uid() inside the function); every
-- other function is service-role only (workers and the drain use the service key).
revoke all on function public.enqueue_job(text, jsonb, text, timestamptz, integer) from public;
grant execute on function public.enqueue_job(text, jsonb, text, timestamptz, integer) to authenticated;

revoke all on function public.claim_job(uuid, integer) from public;
revoke all on function public.complete_job(uuid, jsonb, jsonb) from public;
revoke all on function public.fail_job(uuid, text, boolean) from public;
revoke all on function public.release_usage_admin(uuid, text, timestamptz) from public;
revoke all on function public.reap_jobs(integer) from public;

grant execute on function public.claim_job(uuid, integer) to service_role;
grant execute on function public.complete_job(uuid, jsonb, jsonb) to service_role;
grant execute on function public.fail_job(uuid, text, boolean) to service_role;
grant execute on function public.release_usage_admin(uuid, text, timestamptz) to service_role;
grant execute on function public.reap_jobs(integer) to service_role;

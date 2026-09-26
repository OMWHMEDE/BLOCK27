-- claim_job: stop re-claiming a job once it has used up its attempts.
--
-- The bug this closes: claim_job would re-claim ANY 'processing' row whose lease
-- had lapsed, with no ceiling on attempts. Combined with the recovery re-kicks
-- (the generate "active job" path and the status-poll recovery), a composition
-- job that never reached 'done' — e.g. its post-response worker was cut off after
-- the generation swap but before complete_job — could be re-claimed and re-run on
-- every poll or every "Generate" tap, minting a fresh generation each time with
-- no new reservation. The reaper already refuses to requeue past max_attempts and
-- terminally fails (and refunds) such jobs; claim_job was the one path that didn't
-- honor the same ceiling. Align it: a job at or past max_attempts is not
-- claimable, so it waits for the reaper's terminal-fail+refund instead of looping.
--
-- Render layers use claim_job_step (migration 0022), which deliberately does NOT
-- count attempts — a normal multi-layer render is not "retries" — so it is left
-- untouched here. Idempotent (create or replace).

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
    and attempts < max_attempts
    and (
      status = 'queued'
      or (status = 'processing' and lease_until is not null and lease_until < now())
    )
  returning * into v_job;
  return v_job;
end;
$$;

revoke all on function public.claim_job(uuid, integer) from public;
grant execute on function public.claim_job(uuid, integer) to service_role;

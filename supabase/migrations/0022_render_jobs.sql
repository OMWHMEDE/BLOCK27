-- Render stepping — claim a job for ONE step without spending a retry.
--
-- A render runs one garment layer per worker invocation so the chain is
-- resumable: if an invocation dies, the next one picks up from the last completed
-- layer. That means many claims per job (one per layer, plus per-layer retries),
-- which must NOT be counted as job attempts the way claim_job does — otherwise a
-- normal multi-layer render would "run out of attempts". claim_job_step leases a
-- queued (or lease-expired processing) job as processing without touching
-- attempts; the render handler tracks per-layer progress and retries in the job's
-- result payload instead.
--
-- Service-role only, like the other worker functions. Idempotent.

create or replace function public.claim_job_step(
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
        lease_until = now() + make_interval(secs => greatest(coalesce(p_lease_seconds, 180), 1)),
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

revoke all on function public.claim_job_step(uuid, integer) from public;
grant execute on function public.claim_job_step(uuid, integer) to service_role;

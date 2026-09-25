# Background jobs

The long operations — outfit generation, try-on render, shopping — run as
background jobs instead of blocking the request. The request enqueues a job and
returns immediately; a worker does the model/provider call after the response;
the client learns the result by polling a status endpoint (nudged by Realtime).
Garment analysis predates this system and still uses its own status-column +
client-poll driver (`WardrobeGrid`) — the pattern here generalizes that idea.

Why: these calls take 15–300s. A synchronous request hits the Vercel function
cap and 504s. Off the request, the cap only bounds one worker step, and a failure
returns a clean status instead of a dead connection.

## The pieces

- **`jobs` table** (migration `0020`) — a job row *is* the queue.
  `id, user_id, kind, status, attempts, max_attempts, payload, result, error,
  timings, reserved_kind, reserved_period, lease_until`. RLS: the owner may
  `select` their own rows; there is **no** insert/update/delete policy — every
  write goes through a `SECURITY DEFINER` function or the service role.
- **`src/lib/jobs/index.ts`** — thin typed wrappers over the lifecycle RPCs:
  `enqueueJob` (owner-scoped, via `auth.uid()`), `claimJob`, `completeJob`,
  `failJob`, `releaseUsageAdmin`, `reapJobs`.
- **`src/lib/jobs/run.ts`** — `runJob(admin, jobId)`: claim → dispatch by kind →
  complete or fail. Used for single-shot jobs (composition, shopping).
- **`src/lib/jobs/handlers/`** — one handler per kind: `composition.ts`,
  `shopping.ts`, `render.ts` (render has its own stepper, see below).
- **`src/app/api/jobs/drain/route.ts`** — the Vercel-cron reaper (see below).

## Lifecycle

```
enqueue (reserve quota)  ->  queued
        worker claims (lease)  ->  processing
                success  ->  done        (complete_job)
                failure  ->  queued      (fail_job, requeue while attempts remain)
                         ->  failed      (fail_job terminal: REFUND reserved quota)
```

- **Quota** is reserved in the enqueue route (`reserve_usage`) and its refund
  coordinates (`reserved_kind`, `reserved_period`) are stored on the job. A
  terminal failure refunds exactly one slot via `release_usage_admin` (the
  service-role sibling of `release_usage`, which needs an explicit user id because
  a worker has no `auth.uid()`). A successful-but-empty run keeps the slot.
- **Idempotency** comes from `claim_job`: it only transitions a `queued` row (or a
  `processing` row whose lease expired), so a duplicate kick is a safe no-op.

## How work is triggered — in-process, no self-fetch

The enqueue route runs the worker **in the same invocation** via Next's
`after()`, after the response is sent:

```ts
after(() => runJob(createAdminClient(), jobId));
return NextResponse.json({ ok: true, jobId });
```

The status-poll route does the same as **recovery**: if it sees the job `queued`
or its lease lapsed, it kicks another `after(runJob)`. `claim_job` keeps a
fast-polling client from spawning overlapping runs.

> History: an earlier version kicked a separate `/api/jobs/run` worker over an
> HTTP self-fetch carrying `CRON_SECRET`. That left jobs stuck `queued` forever
> whenever the secret was unset or the fetch dropped. It was replaced by the
> in-process pattern (#113). Do not reintroduce the self-fetch worker.

## Client contract

`POST` returns immediately:
- `{ ok: true, jobId }` — poll for the result.
- `{ ok: true, jobId, already: true }` — a run was already in flight; poll it.
- a synchronous short-circuit (thin wardrobe, quota `note`) — no job, show it.

`GET .../<the op>?job=<id>` returns `{ status, ... }`. The client polls (~1.5–2s)
and subscribes to Realtime on `jobs` (`postgres_changes`, `id=eq.<jobId>`) for an
instant nudge; **polling is the guarantee, Realtime only accelerates it.** On
`done` the client refreshes; on `failed` it shows a retry. Realtime is optional —
enable it on the `jobs` table in Supabase for the instant feel.

## Two shapes of job

- **Single-shot** (composition, shopping): one worker step does the whole model
  call, then `complete_job`. Routed through `runJob`.
- **Stepped / resumable** (render): one garment **layer per invocation**, so a
  died invocation resumes from the last completed layer. Progress lives in the
  job's `result` cursor (`layerIndex`, `personPath`, `layerAttempt`, `tmpPaths`).
  Each step is claimed with **`claim_job_step`** (migration `0022`), which leases
  *without* spending a retry — layers are not attempts, so per-layer retry is
  tracked in `result`, not `attempts`. See `handlers/render.ts` and the pure
  `decideRenderStep`.

Generation additionally streams: it writes each outfit into a new *generation*
and swaps it in atomically when done, so the old set stays visible until the new
one is ready (migration `0021`, `swap_outfit_generation`). See
`handlers/composition.ts`.

## The drain (backstop)

`/api/jobs/drain` (Vercel Cron, `CRON_SECRET`) calls `reap_jobs`: requeue jobs
whose lease lapsed but that still have attempts, and terminally fail + refund
anything past its retries or a hard max age (`JOBS_MAX_AGE_HOURS`, default 24).
It is the last resort — the fast path is the in-process kick and the client poll.
On Vercel Hobby, cron runs at most daily; tighten the schedule on Pro.

## Adding a new job kind

1. Add the kind to the `jobs_kind_check` (and `reserved_kind` check if metered)
   constraint in a new migration.
2. Write a handler in `handlers/<kind>.ts` returning `{ result, timings? }`.
3. Add a `case` to the dispatch in `run.ts`.
4. In the enqueue route: reserve quota, `enqueueJob`, `after(() => runJob(...))`,
   return `{ ok, jobId }`. Add a `GET ?job=` status route that re-kicks a stalled
   job and reports status.
5. Keep any pure decision logic in its own function and unit-test it (see
   `tests/outfit-validate.test.ts`, `tests/render-step.test.ts`).

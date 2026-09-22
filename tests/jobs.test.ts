import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enqueueJob,
  claimJob,
  completeJob,
  failJob,
  releaseUsageAdmin,
  reapJobs,
} from "@/lib/jobs";

// A fake client that records the last rpc(name, params) and returns a canned
// { data, error }. Enough to prove the wrappers shape their RPC calls correctly
// and map the results — the atomic behavior itself lives in SQL (migration 0020).
type RpcReturn = { data: unknown; error: { message: string } | null };
function fakeClient(ret: RpcReturn) {
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  const client = {
    rpc: (name: string, params: Record<string, unknown>) => {
      calls.push({ name, params });
      return Promise.resolve(ret);
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("jobs wrappers", () => {
  it("enqueueJob passes owner-safe params and returns the new id", async () => {
    const { client, calls } = fakeClient({ data: "job-1", error: null });
    const id = await enqueueJob(client, {
      kind: "render",
      payload: { outfitId: "o1" },
      reservedKind: "render",
      reservedPeriod: "2026-01-01T00:00:00.000Z",
    });
    expect(id).toBe("job-1");
    expect(calls[0].name).toBe("enqueue_job");
    expect(calls[0].params).toMatchObject({
      p_kind: "render",
      p_payload: { outfitId: "o1" },
      p_reserved_kind: "render",
      p_reserved_period: "2026-01-01T00:00:00.000Z",
      p_max_attempts: 3,
    });
    // No user id is ever passed from the client — the DB derives it from auth.uid().
    expect(Object.keys(calls[0].params)).not.toContain("p_user_id");
  });

  it("enqueueJob returns null on error so the caller can refund", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    expect(await enqueueJob(client, { kind: "shopping" })).toBeNull();
  });

  it("claimJob returns the row when a job was claimed", async () => {
    const row = { id: "job-1", status: "processing" };
    const { client, calls } = fakeClient({ data: row, error: null });
    const job = await claimJob(client, "job-1", 120);
    expect(job).toEqual(row);
    expect(calls[0]).toEqual({
      name: "claim_job",
      params: { p_id: "job-1", p_lease_seconds: 120 },
    });
  });

  it("claimJob returns null when nothing was claimable", async () => {
    // A NULL composite comes back as null, and a null-id row must also be treated
    // as 'not claimed'.
    for (const data of [null, { id: null, status: "queued" }]) {
      const { client } = fakeClient({ data, error: null });
      expect(await claimJob(client, "job-1")).toBeNull();
    }
  });

  it("failJob truncates the message and returns the DB outcome", async () => {
    const { client, calls } = fakeClient({ data: "requeued", error: null });
    const long = "x".repeat(900);
    const outcome = await failJob(client, "job-1", long, true);
    expect(outcome).toBe("requeued");
    expect(calls[0].name).toBe("fail_job");
    expect(calls[0].params.p_requeue).toBe(true);
    expect((calls[0].params.p_error as string).length).toBe(500);
  });

  it("failJob reports 'missing' on error", async () => {
    const { client } = fakeClient({ data: null, error: { message: "nope" } });
    expect(await failJob(client, "job-1", "e", false)).toBe("missing");
  });

  it("completeJob and releaseUsageAdmin forward their params", async () => {
    const c1 = fakeClient({ data: null, error: null });
    await completeJob(c1.client, "job-1", { url: "u" }, { totalMs: 10 });
    expect(c1.calls[0]).toEqual({
      name: "complete_job",
      params: { p_id: "job-1", p_result: { url: "u" }, p_timings: { totalMs: 10 } },
    });

    const c2 = fakeClient({ data: null, error: null });
    await releaseUsageAdmin(c2.client, "user-1", "render", "2026-01-01T00:00:00.000Z");
    expect(c2.calls[0]).toEqual({
      name: "release_usage_admin",
      params: {
        p_user_id: "user-1",
        p_kind: "render",
        p_period_start: "2026-01-01T00:00:00.000Z",
      },
    });
  });

  it("reapJobs returns counts, defaulting missing fields to zero", async () => {
    const ok = fakeClient({ data: { requeued: 2, failed: 1 }, error: null });
    expect(await reapJobs(ok.client, 3600)).toEqual({ requeued: 2, failed: 1 });
    expect(ok.calls[0].params).toEqual({ p_max_age_seconds: 3600 });

    const partial = fakeClient({ data: { requeued: 5 }, error: null });
    expect(await reapJobs(partial.client, 3600)).toEqual({ requeued: 5, failed: 0 });

    const bad = fakeClient({ data: null, error: { message: "x" } });
    expect(await reapJobs(bad.client, 3600)).toEqual({ requeued: 0, failed: 0 });
  });
});

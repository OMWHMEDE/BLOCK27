import "server-only";

// Fire-and-forget kick of the background worker for a job. Uses the app's own
// origin and the CRON_SECRET, so only this server can start a worker. Callers
// schedule it with Next `after(...)`, so it never blocks the response. claim_job
// makes a duplicate kick a harmless no-op, so it's safe to call liberally (at
// enqueue, and again from a status poll that finds the job stalled).
export async function kickWorker(origin: string, jobId: string): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[jobs] kick skipped — CRON_SECRET not set");
    return;
  }
  try {
    await fetch(`${origin}/api/jobs/run`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ jobId }),
    });
  } catch (e) {
    console.error("[jobs] kick failed", e instanceof Error ? e.message : "");
  }
}

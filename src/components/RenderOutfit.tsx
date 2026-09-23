"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { ERR_RETRY } from "@/lib/support";

// Triggers a render and follows it to completion. The render runs as a background
// job (one garment layer per step); this enqueues it, then polls for progress —
// nudged by Realtime when it's enabled, polling always as the fallback — and
// refreshes the page when the finished image lands. Never a silent spinner.
const POLL_MS = 2000;

type RenderStatus = "queued" | "processing" | "done" | "failed" | "none";

export function RenderOutfit({
  outfitId,
  hasRender,
  center = false,
}: {
  outfitId: string;
  hasRender: boolean;
  center?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ layer: number; total: number } | null>(null);

  const jobActive = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const stopWatching = useCallback(() => {
    jobActive.current = false;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/outfits/${outfitId}/render`);
      if (!res.ok) return;
      const b = (await res.json().catch(() => ({}))) as {
        status?: RenderStatus;
        layer?: number;
        totalLayers?: number;
        url?: string | null;
      };
      if (typeof b.layer === "number" && typeof b.totalLayers === "number" && b.totalLayers > 0) {
        setProgress({ layer: b.layer, total: b.totalLayers });
      }
      if (b.status === "done") {
        stopWatching();
        setBusy(false);
        setProgress(null);
        router.refresh();
      } else if (b.status === "failed") {
        stopWatching();
        setBusy(false);
        setProgress(null);
        setError(ERR_RETRY);
      }
    } catch {
      // Network blip — the interval will try again.
    }
  }, [outfitId, router, stopWatching]);

  const watch = useCallback(
    (jobId: string) => {
      jobActive.current = true;
      void poll();
      pollRef.current = setInterval(() => void poll(), POLL_MS);
      try {
        const supabase = createClient();
        channelRef.current = supabase
          .channel(`render-${jobId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
            () => void poll(),
          )
          .subscribe();
      } catch {
        // Realtime unavailable — polling covers it.
      }
    },
    [poll],
  );

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setProgress(null);
    try {
      const res = await fetch(`/api/outfits/${outfitId}/render`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        jobId?: string;
        quota?: boolean;
        paywall?: boolean;
        consentRequired?: boolean;
        message?: string;
        error?: string;
      };
      if (res.ok && body.ok && body.jobId) {
        watch(body.jobId);
        return; // stays busy until the watcher finishes
      }
      if (body.paywall) {
        setNotice(body.message || "Try-on is paid. Upgrade to see it on you.");
      } else if (body.quota) {
        setNotice(body.message || "Render limit reached.");
      } else if (body.consentRequired) {
        setNotice("Agree to the try-on consent first, then this unlocks.");
      } else {
        setError(body.error || ERR_RETRY);
      }
      setBusy(false);
    } catch {
      setError(ERR_RETRY);
      setBusy(false);
    }
  }, [outfitId, watch]);

  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center" : ""}`}>
      {busy ? (
        // Alive on black — the payoff is coming, not stalled.
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="pulse-slow uppercase tracking-[0.25em] text-bone text-sm">
            Dressing you
          </p>
          {progress ? (
            <p className="font-mono text-xs text-ash">
              {String(progress.layer).padStart(2, "0")} / {String(progress.total).padStart(2, "0")}
            </p>
          ) : null}
          <span aria-hidden className="pulse-slow block h-px w-16 bg-bone" />
        </div>
      ) : (
        <button
          type="button"
          onClick={run}
          className={`${hasRender ? btnSecondary : btnPrimary} ${center ? "" : "self-start"}`}
        >
          {hasRender ? "Re-render" : "See it on you"}
        </button>
      )}

      {notice ? (
        <p className={`text-ash text-sm max-w-md ${center ? "text-center" : ""}`}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className={`text-blood text-sm border border-blood px-3 py-2 max-w-md ${center ? "text-center" : ""}`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

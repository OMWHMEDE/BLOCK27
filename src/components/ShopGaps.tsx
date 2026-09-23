"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { ERR_GENERIC } from "@/lib/support";

// The consultation control. It asks the one cold question — what are you working
// with — then runs the audit as a background job: enqueue, then poll for
// completion (nudged by Realtime, polling as the fallback) and refresh when the
// picks are stored. Skipping is allowed: the brain advises without a budget.
const POLL_MS = 2000;

type ShopStatus = "queued" | "processing" | "done" | "failed";

export function ShopGaps({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const stopWatching = useCallback(() => {
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

  const poll = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/shopping?job=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const b = (await res.json().catch(() => ({}))) as { status?: ShopStatus };
        if (b.status === "done") {
          stopWatching();
          setBusy(false);
          router.refresh();
        } else if (b.status === "failed") {
          stopWatching();
          setBusy(false);
          setError(ERR_GENERIC);
        }
      } catch {
        // Network blip — the interval retries.
      }
    },
    [router, stopWatching],
  );

  const watch = useCallback(
    (jobId: string) => {
      void poll(jobId);
      pollRef.current = setInterval(() => void poll(jobId), POLL_MS);
      try {
        const supabase = createClient();
        channelRef.current = supabase
          .channel(`shopping-${jobId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
            () => void poll(jobId),
          )
          .subscribe();
      } catch {
        // Realtime unavailable — polling covers it.
      }
    },
    [poll],
  );

  const run = useCallback(
    async (withBudget: boolean) => {
      setBusy(true);
      setError(null);
      setNote(null);
      const budget = withBudget ? Number(amount) : null;
      try {
        const res = await fetch("/api/shopping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ budget }),
        });
        const b = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          jobId?: string;
          error?: string;
          note?: string;
          advice?: string;
          count?: number;
        };
        if (!res.ok || !b.ok) {
          setError(b.error || ERR_GENERIC);
          setBusy(false);
        } else if (b.jobId) {
          watch(b.jobId); // stays busy until the watcher finishes
        } else if (b.note) {
          // Allowance reached — a plain, on-brand note, not an emergency.
          setNote(b.note);
          setBusy(false);
        } else if (b.advice) {
          // Empty wardrobe — advise plainly, nothing stored to refresh into.
          setNote(b.advice);
          setBusy(false);
        } else {
          setBusy(false);
          router.refresh();
        }
      } catch {
        setError(ERR_GENERIC);
        setBusy(false);
      }
    },
    [amount, router, watch],
  );

  const validAmount = Number(amount) > 0;

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.08em] text-ash">
          What are you working with?
        </span>
        <div className="flex items-center border border-iron focus-within:border-paper max-w-[12rem]">
          <span className="pl-4 pr-1 text-ash font-mono select-none">$</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            disabled={busy}
            className="w-full bg-transparent py-3 pr-4 text-paper font-mono outline-none placeholder:text-iron"
          />
        </div>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={busy || !validAmount}
          className={`${btnPrimary} self-start`}
        >
          {busy ? "Reading your wardrobe" : hasSession ? "Run it again" : "Find my gaps"}
        </button>
        <button
          type="button"
          onClick={() => run(false)}
          disabled={busy}
          className={`${btnSecondary} self-start`}
        >
          Skip — just advise
        </button>
      </div>

      {note ? <p className="text-ash text-sm max-w-md">{note}</p> : null}

      {error ? (
        <p className="text-blood text-sm border border-blood px-3 py-2 max-w-md">
          {error}
        </p>
      ) : null}
    </div>
  );
}

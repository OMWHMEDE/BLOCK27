"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, blockActive, blockInactive } from "@/lib/ui";
import { ERR_GENERIC } from "@/lib/support";

// Before composing, ask one short context question and feed the answer as the
// occasion. Skipping falls back to the default — it never blocks generation.
const QUICK = ["Work", "Out", "Formal", "Relaxed"];

const POLL_MS = 1500;

// The streaming shape returned by /api/outfits/generation — matches OutfitView.
type DraftItem = { id: string; url: string | null; descriptor: string; category: string };
type Draft = { id: string; reasoning: string; items: DraftItem[] };
type GenStatus = "queued" | "processing" | "done" | "failed";

export function GenerateOutfits() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Composing state: the in-flight job and the outfits streaming in.
  const [jobId, setJobId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
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

  const poll = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/outfits/generation?job=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const b = (await res.json().catch(() => ({}))) as {
          status?: GenStatus;
          outfits?: Draft[];
          gap?: string | null;
        };
        if (Array.isArray(b.outfits)) setDrafts(b.outfits);

        if (b.status === "done") {
          stopWatching();
          setNote(b.gap || null);
          setJobId(null);
          setBusy(false);
          setDrafts([]);
          setAsking(false);
          // The swap has published the new set — pull it in.
          router.refresh();
        } else if (b.status === "failed") {
          stopWatching();
          setError(ERR_GENERIC);
          setJobId(null);
          setBusy(false);
          setDrafts([]);
        }
      } catch {
        // Network blip — the interval will try again.
      }
    },
    [router, stopWatching],
  );

  // Watch a job: poll on an interval, and let Realtime (when available) nudge an
  // immediate poll on each change. Polling is the guarantee; Realtime just makes
  // it feel instant. Falls back cleanly if Realtime isn't enabled.
  useEffect(() => {
    if (!jobId) return;
    // poll() only setStates after an await (fetch), never synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void poll(jobId);
    pollRef.current = setInterval(() => void poll(jobId), POLL_MS);

    try {
      const supabase = createClient();
      const channel = supabase
        .channel(`job-${jobId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
          () => void poll(jobId),
        )
        .subscribe();
      channelRef.current = channel;
    } catch {
      // Realtime unavailable — polling covers it.
    }

    return () => stopWatching();
  }, [jobId, poll, stopWatching]);

  const run = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      setNote(null);
      setDrafts([]);
      try {
        const res = await fetch("/api/outfits/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ occasion: value }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          jobId?: string;
          gap?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(body.error || ERR_GENERIC);
          setBusy(false);
          return;
        }
        if (body.jobId) {
          // Composing — hand off to the watcher; stays busy until it finishes.
          setJobId(body.jobId);
          return;
        }
        // No job: thin wardrobe or quota — an immediate note, nothing to watch.
        setNote(body.gap || null);
        setAsking(false);
        setBusy(false);
        router.refresh();
      } catch {
        setError(ERR_GENERIC);
        setBusy(false);
      }
    },
    [router],
  );

  const composing = jobId !== null;

  if (!asking && !composing) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setNote(null);
            setError(null);
            setAsking(true);
          }}
          className={`${btnPrimary} self-start`}
        >
          Generate outfits
        </button>
        {note ? <p className="text-ash text-sm max-w-md">{note}</p> : null}
        {error ? (
          <p className="text-blood text-sm border border-blood px-3 py-2 max-w-md">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  // Composing: show the outfits arriving one at a time. The user's existing
  // outfits stay on the page below until this run's set is published.
  if (composing) {
    return (
      <div className="reveal flex flex-col gap-6 max-w-md">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">
          Composing
          {drafts.length > 0 ? (
            <span className="text-bone font-mono ml-3">
              {String(drafts.length).padStart(2, "0")}
            </span>
          ) : null}
        </p>

        {drafts.length === 0 ? (
          <p className="text-ash text-sm">Reading your wardrobe.</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {drafts.map((d) => (
              <li key={d.id} className="reveal flex flex-col gap-3 border-t border-iron pt-5 first:border-t-0 first:pt-0">
                <p className="text-bone text-sm leading-snug">{d.reasoning}</p>
                <div className="flex gap-1">
                  {d.items.map((it) => (
                    <div
                      key={it.id}
                      className="w-10 aspect-[3/4] bg-void overflow-hidden border border-iron"
                    >
                      {it.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.url}
                          alt={it.descriptor || "Garment"}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const selected = occasion.trim().toLowerCase();

  return (
    <div className="reveal flex flex-col gap-5 max-w-md">
      <p className="text-lg tracking-tight">Where are you headed?</p>

      <div className="flex flex-wrap gap-1">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => setOccasion(q)}
            className={selected === q.toLowerCase() ? blockActive : blockInactive}
          >
            {q}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={occasion}
        onChange={(e) => setOccasion(e.target.value)}
        placeholder="or in your own words"
        maxLength={200}
        disabled={busy}
        className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper placeholder:text-ash"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => run(occasion)}
          disabled={busy}
          className={btnPrimary}
        >
          {busy ? "Cooking." : "Generate"}
        </button>
        <button
          type="button"
          onClick={() => run("")}
          disabled={busy}
          className={btnSecondary}
        >
          Skip
        </button>
      </div>

      {error ? (
        <p className="text-blood text-sm border border-blood px-3 py-2">{error}</p>
      ) : null}
    </div>
  );
}

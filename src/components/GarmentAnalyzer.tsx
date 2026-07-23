"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Drives garment analysis from the wardrobe: kicks off analysis for any garment
// still 'pending' (once each, deduped by id), refreshes while anything is in
// flight, and — critically — surfaces the real error if analysis fails, so a
// failure never looks like an endless "Analyzing…". The endpoint is idempotent,
// so a retry is safe.
export function GarmentAnalyzer({
  pendingIds,
  active,
}: {
  pendingIds: string[];
  active: boolean;
}) {
  const router = useRouter();
  const triggered = useRef<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/garments/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ garmentId: id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || `Analysis failed (${res.status}).`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis request failed.");
    }
  }, []);

  useEffect(() => {
    for (const id of pendingIds) {
      if (triggered.current.has(id)) continue;
      triggered.current.add(id);
      void analyze(id);
    }
  }, [pendingIds, analyze]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [active, router]);

  const retry = useCallback(() => {
    triggered.current.clear();
    setError(null);
    router.refresh();
  }, [router]);

  if (!error) return null;

  return (
    <div className="border border-blood px-4 py-3 mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-blood text-sm uppercase tracking-[0.08em]">
          Analysis failed
        </p>
        <p className="text-ash text-sm mt-1 break-words">{error}</p>
      </div>
      <button
        type="button"
        onClick={retry}
        className="shrink-0 text-xs uppercase tracking-[0.08em] text-paper hover:text-bone"
      >
        Retry
      </button>
    </div>
  );
}

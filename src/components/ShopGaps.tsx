"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// Triggers the shopping consultation and surfaces the brain's verdict — the
// honest overall read, including "you're solid, buy nothing" — or a real error.
// Never a silent spinner.
export function ShopGaps({ hasRecs }: { hasRecs: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setVerdict(null);
    try {
      const res = await fetch("/api/shopping", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        verdict?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error || `Consultation failed (${res.status}).`);
      } else {
        setVerdict(body.verdict || null);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Consultation request failed.");
    } finally {
      setBusy(false);
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={
          "self-start px-6 py-3 uppercase tracking-wide text-sm disabled:opacity-50 " +
          (hasRecs
            ? "border border-iron text-bone hover:border-paper hover:text-paper"
            : "bg-paper text-void hover:bg-bone")
        }
      >
        {busy
          ? "Reading your wardrobe"
          : hasRecs
            ? "Run it again"
            : "Find my gaps"}
      </button>

      {verdict ? <p className="text-bone text-sm max-w-md">{verdict}</p> : null}
      {error ? (
        <p className="text-blood text-sm border border-blood px-3 py-2 max-w-md">
          {error}
        </p>
      ) : null}
    </div>
  );
}

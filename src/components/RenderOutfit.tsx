"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary } from "@/lib/ui";

// Triggers a render and never leaves a silent spinner: a loading state while it
// runs, a plain block when the quota is hit, or a real error with Retry.
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

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/outfits/${outfitId}/render`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        quota?: boolean;
        paywall?: boolean;
        message?: string;
        error?: string;
      };
      if (res.ok && body.ok) {
        router.refresh();
      } else if (body.paywall) {
        setNotice(body.message || "Try-on is paid. Upgrade to see it on you.");
      } else if (body.quota) {
        setNotice(body.message || "Render limit reached.");
      } else {
        setError(body.error || `Render failed (${res.status}).`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render request failed.");
    } finally {
      setBusy(false);
    }
  }, [outfitId, router]);

  return (
    <div className={`flex flex-col gap-3 ${center ? "items-center" : ""}`}>
      {busy ? (
        // Alive on black — the payoff is coming, not stalled.
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="pulse-slow uppercase tracking-[0.25em] text-bone text-sm">
            Dressing you
          </p>
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

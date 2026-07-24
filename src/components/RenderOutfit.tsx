"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// Triggers a render and never leaves a silent spinner: a loading state while it
// runs, a plain block when the quota is hit, or a real error with Retry.
export function RenderOutfit({
  outfitId,
  hasRender,
}: {
  outfitId: string;
  hasRender: boolean;
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
        message?: string;
        error?: string;
      };
      if (res.ok && body.ok) {
        router.refresh();
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={
          "self-start px-6 py-3 uppercase tracking-wide text-sm disabled:opacity-60 " +
          (hasRender
            ? "border border-iron text-bone hover:border-paper hover:text-paper"
            : "bg-paper text-void hover:bg-bone")
        }
      >
        {busy
          ? "Rendering — this takes a minute"
          : hasRender
            ? "Re-render"
            : "See it on you"}
      </button>

      {notice ? <p className="text-ash text-sm max-w-md">{notice}</p> : null}
      {error ? (
        <p className="text-blood text-sm border border-blood px-3 py-2 max-w-md">
          {error}
        </p>
      ) : null}
    </div>
  );
}

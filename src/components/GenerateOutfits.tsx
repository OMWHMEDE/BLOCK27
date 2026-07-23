"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// Triggers outfit composition and surfaces the result: the brain's gap note
// (honest thin-wardrobe truth) or a real error. Never a silent spinner.
export function GenerateOutfits() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/outfits/generate", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        gap?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error || `Generation failed (${res.status}).`);
      } else {
        setNote(body.gap || null);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation request failed.");
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
        className="bg-paper text-void py-3 uppercase tracking-wide text-sm hover:bg-bone disabled:opacity-50 self-start px-6"
      >
        {busy ? "Thinking" : "Generate outfits"}
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

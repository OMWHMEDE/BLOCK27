"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  btnPrimary,
  btnSecondary,
  blockActive,
  blockInactive,
} from "@/lib/ui";
import { ERR_GENERIC } from "@/lib/support";

// Before composing, ask one short context question and feed the answer to the
// existing composition call as the occasion. Skipping falls back to the default
// behaviour — it never blocks generation.
const QUICK = ["Work", "Out", "Formal", "Relaxed"];

export function GenerateOutfits() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      setNote(null);
      try {
        const res = await fetch("/api/outfits/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ occasion: value }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          gap?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(body.error || ERR_GENERIC);
        } else {
          setNote(body.gap || null);
          setAsking(false);
          router.refresh();
        }
      } catch {
        setError(ERR_GENERIC);
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  if (!asking) {
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
        <p className="text-blood text-sm border border-blood px-3 py-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}

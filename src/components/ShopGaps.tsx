"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { ERR_GENERIC } from "@/lib/support";

// The consultation control. It asks the one cold question — what are you working
// with — then runs the audit. Skipping is allowed: the brain then advises without
// allocating a budget. Never a silent spinner; a real error surfaces with the
// wording the user can act on.
export function ShopGaps({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
          error?: string;
          note?: string;
        };
        if (!res.ok || !b.ok) {
          setError(b.error || ERR_GENERIC);
        } else if (b.note) {
          // Allowance reached — a plain, on-brand note, not an emergency.
          setNote(b.note);
        } else {
          router.refresh();
        }
      } catch {
        setError(ERR_GENERIC);
      } finally {
        setBusy(false);
      }
    },
    [amount, router],
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

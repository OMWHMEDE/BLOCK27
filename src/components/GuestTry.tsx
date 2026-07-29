"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { LockedTryOn } from "@/components/LockedTryOn";

type Item = { id: string; url: string | null; descriptor: string };
type Outfit = { item_ids: string[]; reasoning: string };

const LIMIT = 3;

// The pre-signup flow. A visitor pulls up to three pieces, taps once, and the
// brain styles them as text — then the payoff is locked behind the block. No
// base photo, no render: the hand is paid-only, and it never runs here.
export function GuestTry() {
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [gap, setGap] = useState<string>("");
  const [reading, setReading] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/guest/garments");
      const b = (await res.json().catch(() => ({}))) as {
        items?: Item[];
        generated?: boolean;
        outfits?: Outfit[];
      };
      setItems(b.items ?? []);
      if (b.generated) setOutfits(b.outfits ?? []);
    } catch {
      // Leave state empty — the visitor can still start.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const onPick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (files.length === 0) return;

      setNotice(null);
      setReading(true);
      const room = LIMIT - items.length;
      let lastError: string | null = null;
      for (const file of files.slice(0, Math.max(0, room))) {
        const form = new FormData();
        form.append("file", file, "piece.jpg");
        try {
          const res = await fetch("/api/guest/garments", {
            method: "POST",
            body: form,
          });
          const b = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            reason?: string;
          };
          if (!b.ok) lastError = b.reason || "Didn't save. Try again.";
        } catch {
          lastError = "Couldn't reach the server. Try again.";
        }
      }
      setReading(false);
      setNotice(lastError);
      await load();
    },
    [items.length, load],
  );

  const generate = useCallback(async () => {
    setCooking(true);
    setNotice(null);
    try {
      const res = await fetch("/api/guest/generate", { method: "POST" });
      const b = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        outfits?: Outfit[];
        gap?: string;
        reason?: string;
      };
      if (b.ok) {
        setOutfits(b.outfits ?? []);
        setGap(b.gap ?? "");
      } else {
        setNotice(b.reason || "Couldn't compose. Try again.");
      }
    } catch {
      setNotice("Couldn't reach the server. Try again.");
    } finally {
      setCooking(false);
    }
  }, []);

  const full = items.length >= LIMIT;
  const canGenerate = items.length >= 2 && !cooking;

  return (
    <div className="flex flex-col gap-10">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        className="hidden"
      />

      {/* The pieces — a tight contact strip, edge to edge. */}
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <div
              key={it.id}
              className="aspect-[3/4] w-20 overflow-hidden border border-iron bg-void"
            >
              {it.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.url}
                  alt={it.descriptor || "Piece"}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          ))}
          {Array.from({ length: Math.max(0, LIMIT - items.length) }).map(
            (_, i) => (
              <div
                key={`slot-${i}`}
                className="flex aspect-[3/4] w-20 items-center justify-center border border-iron bg-void"
              >
                <span className="font-mono text-xs text-iron">27</span>
              </div>
            ),
          )}
        </div>
      ) : null}

      {/* Before generation: pull pieces, then style them. */}
      {outfits === null ? (
        <div className="flex flex-col gap-5">
          {items.length === 0 ? (
            <p className="max-w-md text-ash">
              Three pieces, no account. Shoot them flat on a plain surface. I
              read them and tell you what to wear.
            </p>
          ) : (
            <p className="text-sm text-ash">
              <span className="font-mono">{items.length}</span> of{" "}
              <span className="font-mono">{LIMIT}</span>.{" "}
              {items.length < 2
                ? "One more, at least."
                : "Style them, or add another."}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {!full ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={reading}
                className={items.length === 0 ? btnPrimary : btnSecondary}
              >
                {reading
                  ? "Reading."
                  : items.length === 0
                    ? "Add pieces"
                    : "Add another"}
              </button>
            ) : null}

            {items.length >= 2 ? (
              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate}
                className={btnPrimary}
              >
                {cooking ? "Cooking." : "Style them"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* After generation: the read as text, then the locked payoff. */}
      {outfits !== null ? (
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-8">
            {outfits.length === 0 ? (
              <p className="max-w-md text-bone leading-snug">
                {gap || "These don't hold together yet. Sign up and add pieces that pair."}
              </p>
            ) : (
              outfits.map((o, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <p className="max-w-md text-bone leading-snug">{o.reasoning}</p>
                  <div className="flex gap-1">
                    {o.item_ids
                      .map((id) => items.find((it) => it.id === id))
                      .filter((x): x is Item => !!x)
                      .map((it) => (
                        <div
                          key={it.id}
                          className="aspect-[3/4] w-14 overflow-hidden border border-iron bg-void"
                        >
                          {it.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.url}
                              alt={it.descriptor || "Piece"}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <LockedTryOn
            headline="That's the outfit. Seeing it on you is paid."
            href="/signup"
            cta="Create account"
          />
        </div>
      ) : null}

      {notice ? <p className="max-w-md text-sm text-bone">{notice}</p> : null}

      {!loaded ? null : (
        <p className="text-sm text-ash">
          Have an account?{" "}
          <Link
            href="/login"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Log in.
          </Link>
        </p>
      )}
    </div>
  );
}

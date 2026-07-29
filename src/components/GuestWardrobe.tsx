"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/lib/ui";

type Item = { id: string; url: string | null; descriptor: string };

const LIMIT = 3;

// The guest wardrobe. A visitor with no account pulls up to three pieces; each
// runs the same moderation + vision analysis as a signed-in upload (the guest
// route enforces both). At the limit, adding surfaces the sign-in door — the
// limit is the push, not a wall thrown up early.
export function GuestWardrobe() {
  const [items, setItems] = useState<Item[]>([]);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/guest/garments");
      const b = (await res.json().catch(() => ({}))) as { items?: Item[] };
      setItems(b.items ?? []);
    } catch {
      // Leave state as-is — the visitor can still start.
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

  const full = items.length >= LIMIT;

  return (
    <section className="flex flex-col gap-8">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        className="hidden"
      />

      <p className="text-xs uppercase tracking-[0.08em] text-ash">
        Pieces{" "}
        <span className="font-mono text-iron">
          {String(items.length).padStart(2, "0")}
        </span>
        <span className="text-iron"> / </span>
        <span className="font-mono text-iron">
          {String(LIMIT).padStart(2, "0")}
        </span>
      </p>

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
        {Array.from({ length: Math.max(0, LIMIT - items.length) }).map((_, i) => (
          <div
            key={`slot-${i}`}
            className="flex aspect-[3/4] w-20 items-center justify-center border border-iron bg-void"
          >
            <span className="font-mono text-xs text-iron">27</span>
          </div>
        ))}
      </div>

      {!full ? (
        <div className="flex flex-col gap-3">
          <p className="max-w-md text-ash text-sm">
            Shoot each piece flat on a plain surface. I read it once and remember
            it.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={reading}
            className={`${items.length === 0 ? btnPrimary : btnSecondary} self-start`}
          >
            {reading ? "Reading." : items.length === 0 ? "Add pieces" : "Add another"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-iron pt-6">
          <p className="max-w-md text-bone leading-snug">
            Three is the guest limit. Sign in to keep going.
          </p>
          <Link href="/login" className={`${btnPrimary} self-start`}>
            Sign in
          </Link>
        </div>
      )}

      {notice ? <p className="max-w-md text-sm text-bone">{notice}</p> : null}
    </section>
  );
}

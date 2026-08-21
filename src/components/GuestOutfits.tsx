"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { btnPrimary } from "@/lib/ui";
import { ERR_GENERIC, ERR_RETRY } from "@/lib/support";
import { LockField } from "@/components/LockField";

type Item = { id: string; url: string | null; descriptor: string };
type Outfit = { item_ids: string[]; reasoning: string };

// The guest outfits screen. The brain composes ONE outfit from the guest's
// pieces as text — no render, no base. Seeing it on you is locked behind the
// 27-field, and a second generation is the sign-in push. One generation per
// guest is enforced server-side; this screen just reflects it.
export function GuestOutfits() {
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [gap, setGap] = useState("");
  const [cooking, setCooking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

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
      // Leave state empty.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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
        setNotice(b.reason || ERR_GENERIC);
      }
    } catch {
      setNotice(ERR_RETRY);
    } finally {
      setCooking(false);
    }
  }, []);

  if (!loaded) {
    return <p className="pulse-slow text-sm uppercase tracking-[0.25em] text-ash">Reading</p>;
  }

  // Before the one generation.
  if (outfits === null) {
    return (
      <section className="flex flex-col gap-6">
        {items.length < 2 ? (
          <p className="max-w-md text-ash">
            Two pieces minimum. Add a couple in the{" "}
            <Link
              href="/wardrobe"
              className="text-paper underline underline-offset-4 hover:text-bone"
            >
              wardrobe
            </Link>
            , then come back.
          </p>
        ) : (
          <>
            <p className="max-w-md text-ash">
              I&rsquo;ll put your pieces together — one outfit, on the house.
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={cooking}
              className={`${btnPrimary} self-start`}
            >
              {cooking ? "Cooking." : "Style them"}
            </button>
          </>
        )}
        {notice ? <p className="max-w-md text-sm text-bone">{notice}</p> : null}
      </section>
    );
  }

  // After the one generation: the read, the locked payoff, the push.
  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-8">
        {outfits.length === 0 ? (
          <p className="max-w-md text-bone leading-snug">
            {gap ||
              "These don't hold together yet. Sign in and add pieces that pair."}
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

      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">
          See it on you
        </p>
        <LockField
          className="w-full max-w-xs aspect-[3/4]"
          message="Seeing it on you needs an account. Sign in."
          href="/login"
          cta="Sign in"
          label="See it on you — locked. Sign in to unlock."
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-iron pt-6">
        <p className="max-w-md text-bone leading-snug">
          One outfit is the guest limit. Sign in to keep going.
        </p>
        <Link href="/login" className={`${btnPrimary} self-start`}>
          Sign in
        </Link>
      </div>
    </section>
  );
}

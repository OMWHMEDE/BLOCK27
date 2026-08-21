"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnDanger, btnSecondary } from "@/lib/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { removeGarmentFromCache } from "@/components/WardrobeGrid";
import { deleteGarmentAction } from "./actions";
import { ERR_GENERIC } from "@/lib/support";

// Two-step delete. The first press arms it and states the cost plainly; the
// second commits. Real deletion — the photo goes with the row. The one --blood
// accent on this screen lives here, because this is the one irreversible act.
export function DeleteGarment({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      const res = await deleteGarmentAction(id);
      if (!res.ok) {
        setError(res.error || ERR_GENERIC);
        setArmed(false);
        return;
      }
      // Gone. Drop it from the wardrobe's client cache so it can't flash back on
      // the cache-first paint, then hand off to the house 27-transition and land
      // on the wardrobe. Two deliberate choices, both fixing the loop-then-404:
      //   - No router.refresh(): this route (/garments/[id]) now 404s on refresh
      //     because the row is gone. Refreshing it here re-ran the deleted route
      //     into notFound() and raced the push — the source of the regression.
      //     The wardrobe's garment list is the client WardrobeGrid, which
      //     revalidates itself, so no server refresh is needed.
      //   - replace(), not push(): a single, bounded navigation to an existing
      //     route (the 27-transition plays during it, then unmounts), and the
      //     dead [id] URL leaves history so Back can't land on a 404 either.
      removeGarmentFromCache(id);
      setLeaving(true);
      router.replace("/wardrobe");
    });
  }

  // Deleted — hold the branded screen over everything until the wardrobe paints.
  if (leaving) return <LoadingScreen />;

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`${btnSecondary} self-start`}
      >
        Delete this piece
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-bone text-sm max-w-md">
        Gone for good — the photo with it. No undo.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className={btnDanger}
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className={btnSecondary}
        >
          Keep it
        </button>
      </div>
      {error ? (
        <p className="text-bone text-sm border border-iron px-3 py-2 max-w-md">
          {error}
        </p>
      ) : null}
    </div>
  );
}

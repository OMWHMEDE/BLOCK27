"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { btnDanger, btnSecondary } from "@/lib/ui";
import { LoadingScreen } from "@/components/LoadingScreen";
import { deleteGarmentAction } from "./actions";

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
      if (res.ok) {
        // Hand off to the house 27-transition while the wardrobe loads, so the
        // delete resolves into the app's own loading language, not an abrupt cut.
        setLeaving(true);
        router.push("/wardrobe");
        router.refresh();
      } else {
        setError(res.error || "Delete failed.");
        setArmed(false);
      }
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

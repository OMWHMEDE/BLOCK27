"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGarmentAction } from "./actions";

// Two-step delete. The first press arms it and states the cost plainly; the
// second commits. Real deletion — the photo goes with the row. The one --blood
// accent on this screen lives here, because this is the one irreversible act.
export function DeleteGarment({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      const res = await deleteGarmentAction(id);
      if (res.ok) {
        router.push("/wardrobe");
        router.refresh();
      } else {
        setError(res.error || "Delete failed.");
        setArmed(false);
      }
    });
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="self-start border border-iron text-ash px-5 py-3 uppercase tracking-wide text-sm hover:border-blood hover:text-blood"
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
          className="bg-blood text-paper px-5 py-3 uppercase tracking-wide text-sm disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={pending}
          className="border border-iron text-ash px-5 py-3 uppercase tracking-wide text-sm hover:border-paper hover:text-paper disabled:opacity-60"
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

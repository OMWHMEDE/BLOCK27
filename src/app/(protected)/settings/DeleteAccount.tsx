"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnDanger, btnSecondary } from "@/lib/ui";
import { ERR_GENERIC } from "@/lib/support";

// A hard two-step: arm, then type DELETE to confirm. The purge runs server-side
// (/api/account/delete, service-role key). --blood appears in exactly one place
// on this screen — the confirm button.
export function DeleteAccount() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/account/delete", { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok || !body.ok) {
          setError(body.error || ERR_GENERIC);
          return;
        }
        await createClient()
          .auth.signOut()
          .catch(() => {});
        router.replace(
          "/login?notice=" + encodeURIComponent("Account deleted. Nothing kept."),
        );
      } catch {
        setError(ERR_GENERIC);
      }
    });
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`${btnSecondary} self-start`}
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-sm">
      <p className="text-bone text-sm leading-snug">
        Delete. This doesn&rsquo;t come back. Every photo, every outfit, wiped.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-[0.08em] text-ash">
          Type DELETE to confirm
        </span>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          autoCapitalize="characters"
          className="bg-transparent border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={run}
          disabled={pending || confirmText !== "DELETE"}
          className={btnDanger}
        >
          {pending ? "Deleting." : "Delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setConfirmText("");
            setError(null);
          }}
          disabled={pending}
          className={btnSecondary}
        >
          Keep it
        </button>
      </div>
      {error ? (
        <p className="text-bone text-sm border border-iron px-3 py-2">{error}</p>
      ) : null}
    </div>
  );
}

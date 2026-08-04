"use client";

import { useState } from "react";
import Link from "next/link";
import { Field27 } from "@/components/Field27";
import { btnPrimary } from "@/lib/ui";

// A locked, paid-only surface. It is masked — not hidden — by the "27" field, so
// the user sees a thing is there without seeing what: a deliberate, premium
// mystery, not an empty or broken state. A small breathing "UNLOCK" block (the
// house device) marks it as intentional and invites the tap — the action, not
// the state — distinct from the identical field a tile shows while loading.
// Tapping never performs the action; it reveals a cold upgrade line and routes
// toward the plan. The paid path never renders this — so the provider behind the
// lock is never even reachable from here.
export function LockField({
  message,
  className = "",
  href = "/settings",
  cta = "Upgrade",
  label = "Unlock this",
}: {
  message: string;
  className?: string;
  href?: string;
  cta?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`relative overflow-hidden border border-iron bg-void ${className}`}
    >
      <Field27 />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className="absolute inset-0 z-10 flex items-center justify-center p-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-paper"
        >
          {/* The trailing letter-space at 0.16em is balanced by a matching
              text-indent, so the label sits optically centred in the block
              instead of shunted left. */}
          <span className="breathe-soft inline-block select-none bg-paper px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] [text-indent:0.16em] text-void">
            Unlock
          </span>
        </button>
      ) : (
        <div className="reveal absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-void px-6 text-center">
          <p className="max-w-[15rem] text-sm leading-snug text-bone">
            {message}
          </p>
          <Link href={href} className={btnPrimary}>
            {cta}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs uppercase tracking-[0.08em] text-ash hover:text-bone"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}

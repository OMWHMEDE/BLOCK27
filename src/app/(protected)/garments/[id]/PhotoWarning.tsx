"use client";

import { useState } from "react";
import Link from "next/link";
import { btnNav } from "@/lib/ui";

// A calm, non-blocking advisory about the garment's PHOTO — never an error (no
// blood, no reject), and dismissible. It says what's wrong and how to fix it,
// then gets out of the way. The garment is already saved and usable; this only
// nudges toward a shot that renders better.
export function PhotoWarning({ text }: { text: string }) {
  const [shown, setShown] = useState(true);
  if (!shown) return null;

  return (
    <div className="border border-iron px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-ash mb-2">
        The shot
      </p>
      <p className="text-bone text-sm leading-snug">{text}</p>
      <div className="mt-4 flex items-center gap-2">
        <Link href="/garments/new" className={btnNav}>
          Reshoot
        </Link>
        <button
          type="button"
          onClick={() => setShown(false)}
          className="text-xs uppercase tracking-[0.08em] text-ash hover:text-bone"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}

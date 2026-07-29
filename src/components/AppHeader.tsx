import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SettingsButton } from "@/components/SettingsButton";
import { blockActive, blockInactive, btnNav } from "@/lib/ui";

// The shared app header. Wordmark hero on the left, the dedicated settings
// control opposite it. The section nav sits below as real bordered blocks — the
// active screen reversed out of a --paper block (the house device). The avatar
// and display name live inside /settings now, not here.
//
// Guest mode: a visitor with no account sees the same shell, minus Shop (a
// signed-in feature). The settings control becomes the door — a quiet, always-
// present "Sign in" — with the persistent unlock cue beneath the nav. The cue is
// a fact, not a nag.

type Key = "wardrobe" | "outfits" | "shop" | "settings";

const NAV: { href: string; label: string; key: Key }[] = [
  { href: "/wardrobe", label: "Wardrobe", key: "wardrobe" },
  { href: "/outfits", label: "Outfits", key: "outfits" },
  { href: "/shopping", label: "Shop", key: "shop" },
];

export function AppHeader({
  current,
  guest = false,
}: {
  current?: Key;
  guest?: boolean;
}) {
  const nav = guest ? NAV.filter((n) => n.key !== "shop") : NAV;

  return (
    <header className="mb-16">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Wordmark />
        {guest ? (
          <Link href="/login" className={btnNav}>
            Sign in
          </Link>
        ) : (
          <SettingsButton />
        )}
      </div>

      <nav className="flex flex-wrap items-center gap-1">
        {nav.map((n) =>
          current === n.key ? (
            <span key={n.key} className={blockActive} aria-current="page">
              {n.label}
            </span>
          ) : (
            <Link key={n.key} href={n.href} className={blockInactive}>
              {n.label}
            </Link>
          ),
        )}
      </nav>

      {guest ? (
        <Link
          href="/login"
          className="mt-3 inline-block text-xs uppercase tracking-[0.08em] text-ash hover:text-bone"
        >
          Sign in to unlock.
        </Link>
      ) : null}
    </header>
  );
}

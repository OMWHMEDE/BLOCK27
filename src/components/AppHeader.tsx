import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SettingsButton } from "@/components/SettingsButton";
import { blockActive, blockInactive } from "@/lib/ui";

// The shared app header. Wordmark hero on the left, the dedicated settings
// control opposite it. The section nav sits below as real bordered blocks — the
// active screen reversed out of a --paper block (the house device). The avatar
// and display name live inside /settings now, not here.

type Key = "wardrobe" | "outfits" | "shop" | "settings";

const NAV: { href: string; label: string; key: Key }[] = [
  { href: "/wardrobe", label: "Wardrobe", key: "wardrobe" },
  { href: "/outfits", label: "Outfits", key: "outfits" },
  { href: "/shopping", label: "Shop", key: "shop" },
];

export function AppHeader({ current }: { current?: Key }) {
  return (
    <header className="mb-16">
      <div className="flex items-center justify-between gap-4 mb-4">
        <Wordmark />
        <SettingsButton />
      </div>

      <nav className="flex flex-wrap items-center gap-1">
        {NAV.map((n) =>
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
    </header>
  );
}

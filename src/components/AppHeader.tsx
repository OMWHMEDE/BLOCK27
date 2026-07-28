import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/storage";
import { Wordmark } from "@/components/Wordmark";
import { Avatar } from "@/components/Avatar";
import { btnNav } from "@/lib/ui";

// The shared app header. Wordmark stays the hero on the left with the section
// links; the avatar + display name sit quiet on the right and tap through to
// /settings. One component so every authed screen matches exactly.
export async function AppHeader({
  current,
}: {
  current?: "wardrobe" | "outfits" | "shop" | "settings";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <header className="flex items-center justify-between gap-4 mb-16">
      <div className="flex items-center gap-4 min-w-0">
        <Wordmark />
        <nav className="flex items-center gap-2">
          {current !== "wardrobe" && (
            <Link href="/wardrobe" className={btnNav}>
              Wardrobe
            </Link>
          )}
          {current !== "outfits" && (
            <Link href="/outfits" className={btnNav}>
              Outfits
            </Link>
          )}
          {current !== "shop" && (
            <Link href="/shopping" className={btnNav}>
              Shop
            </Link>
          )}
        </nav>
      </div>

      <Link
        href="/settings"
        className="group flex items-center gap-3 min-w-0"
        aria-label="Settings"
      >
        {profile?.displayName ? (
          <span className="hidden sm:inline truncate text-sm text-bone transition-colors group-hover:text-paper">
            {profile.displayName}
          </span>
        ) : null}
        <Avatar url={profile?.avatarUrl ?? null} />
      </Link>
    </header>
  );
}

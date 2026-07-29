import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBasePhotoUrl } from "@/lib/supabase/storage";
import { getPlan } from "@/lib/plan";
import { AppHeader } from "@/components/AppHeader";
import { TileImage } from "@/components/TileImage";
import { WardrobeGrid } from "@/components/WardrobeGrid";
import { LockField } from "@/components/LockField";
import { btnNav, btnSecondary } from "@/lib/ui";

// The garment grid is client-side and cache-first (WardrobeGrid), so returning
// to the wardrobe paints instantly from cache instead of refetching and flashing
// every tile from black. The server here only resolves the base photo.
export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [baseUrl, paid] = user
    ? await Promise.all([
        getBasePhotoUrl(user.id),
        getPlan(user.id).then((p) => p.paid),
      ])
    : [null, false];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="wardrobe" />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Wardrobe.
      </h1>
      <p className="text-ash max-w-md mb-16">Everything you own, as I read it.</p>

      {/* Base photo — the foundation, stays at the top. Paid-only: on free it is
          locked behind the 27-field, visible but not usable. */}
      <section className="mb-24">
        <p className="text-xs uppercase tracking-[0.08em] text-ash mb-4">
          Your base
        </p>

        {!paid ? (
          <LockField
            className="w-32 aspect-[3/4]"
            message="Your base is a paid thing. Upgrade to unlock it."
            label="Base photo — locked. Upgrade to unlock."
          />
        ) : baseUrl ? (
          <div className="flex items-end gap-5">
            <div className="w-32 aspect-[3/4] border border-iron">
              <TileImage cacheKey="base" url={baseUrl} alt="Your base photo" />
            </div>
            <Link href="/capture" className={btnNav}>
              Retake
            </Link>
          </div>
        ) : (
          <Link href="/capture" className={btnSecondary}>
            Shoot your base
          </Link>
        )}
      </section>

      <WardrobeGrid />
    </main>
  );
}

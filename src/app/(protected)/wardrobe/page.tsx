import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBasePhotoUrl, listGarmentThumbs } from "@/lib/supabase/storage";
import { logout } from "@/app/logout/actions";

export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [baseUrl, garments] = user
    ? await Promise.all([getBasePhotoUrl(user.id), listGarmentThumbs(user.id)])
    : [null, []];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-baseline justify-between mb-24">
        <span className="text-sm tracking-tight">BLOCK27</span>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
          >
            Log out
          </button>
        </form>
      </div>

      {/* Base photo — the foundation, stays at the top. */}
      <section className="mb-24">
        <p className="text-xs uppercase tracking-[0.08em] text-ash mb-4">
          Your base
        </p>

        {baseUrl ? (
          <div className="flex items-end gap-5">
            <div className="w-32 aspect-[3/4] bg-void overflow-hidden border border-iron">
              {/* Private object via a 300s signed URL; next/image adds nothing. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={baseUrl}
                alt="Your base photo"
                className="h-full w-full object-cover"
              />
            </div>
            <Link
              href="/capture"
              className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper pb-1"
            >
              Retake
            </Link>
          </div>
        ) : (
          <Link
            href="/capture"
            className="inline-flex items-center justify-center border border-iron text-bone px-5 py-3 uppercase tracking-wide text-sm hover:border-paper hover:text-paper"
          >
            Shoot your base
          </Link>
        )}
      </section>

      {/* Wardrobe — the garment grid. */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs uppercase tracking-[0.08em] text-ash">
            Wardrobe{" "}
            <span className="text-iron">
              {String(garments.length).padStart(2, "0")}
            </span>
          </p>
          <Link
            href="/garments/new"
            className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
          >
            Add
          </Link>
        </div>

        {garments.length === 0 && (
          <p className="text-ash mb-4">Empty. Shoot five pieces.</p>
        )}

        <div className="grid grid-cols-3 gap-1">
          <Link
            href="/garments/new"
            className="aspect-[3/4] flex items-center justify-center border border-iron text-ash uppercase tracking-[0.08em] text-xs hover:border-paper hover:text-paper"
          >
            Add
          </Link>

          {garments.map((g) => (
            <div
              key={g.id}
              className="aspect-[3/4] bg-void overflow-hidden border border-iron"
            >
              {g.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.url}
                  alt="Garment"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

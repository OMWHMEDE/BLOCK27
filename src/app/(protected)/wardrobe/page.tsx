import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getBasePhotoUrl,
  listGarmentThumbs,
  type GarmentThumb,
} from "@/lib/supabase/storage";
import { logout } from "@/app/logout/actions";
import { GarmentAnalyzer } from "@/components/GarmentAnalyzer";
import { Wordmark } from "@/components/Wordmark";
import { btnNav, btnSecondary } from "@/lib/ui";

export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [baseUrl, garments] = user
    ? await Promise.all([getBasePhotoUrl(user.id), listGarmentThumbs(user.id)])
    : [null, []];

  const pendingIds = garments
    .filter((g) => g.status === "pending")
    .map((g) => g.id);
  const anyActive = garments.some(
    (g) => g.status === "pending" || g.status === "analyzing",
  );

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <GarmentAnalyzer pendingIds={pendingIds} active={anyActive} />

      <div className="flex items-center justify-between mb-16">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link href="/outfits" className={btnNav}>
            Outfits
          </Link>
          <Link href="/shopping" className={btnNav}>
            Shop
          </Link>
          <form action={logout}>
            <button type="submit" className={btnNav}>
              Log out
            </button>
          </form>
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Wardrobe.
      </h1>
      <p className="text-ash max-w-md mb-16">
        Everything you own, as I read it.
      </p>

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

      {/* Wardrobe — each garment with the brain's read-back. */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-xs uppercase tracking-[0.08em] text-ash">
            Pieces{" "}
            <span className="text-iron">
              {String(garments.length).padStart(2, "0")}
            </span>
          </p>
          <Link href="/garments/new" className={btnNav}>
            Add
          </Link>
        </div>

        {garments.length === 0 ? (
          <p className="text-ash max-w-md">
            Empty. Shoot five pieces and I&rsquo;ll start putting outfits
            together.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-1">
            {garments.map((g) => (
              <GarmentTile key={g.id} garment={g} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function GarmentTile({ garment }: { garment: GarmentThumb }) {
  const { id, status, url, analysis } = garment;
  const rejected = status === "rejected";
  const analyzed = status === "analyzed" && analysis;

  return (
    <li>
      <Link href={`/garments/${id}`} className="group block">
        <div
          className={
            "aspect-[3/4] bg-void overflow-hidden border border-iron group-hover:border-paper " +
            (rejected ? "opacity-40" : "")
          }
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={analyzed ? analysis.descriptor : "Garment"}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <p className="text-ash text-xs mt-1 truncate">
          {analyzed
            ? analysis.descriptor
            : rejected
              ? "Won't read"
              : "Reading…"}
        </p>
      </Link>
    </li>
  );
}

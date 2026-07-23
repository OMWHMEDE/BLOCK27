import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listOutfits, type OutfitView } from "@/lib/supabase/storage";
import { GenerateOutfits } from "@/components/GenerateOutfits";

export default async function OutfitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const outfits = user ? await listOutfits(user.id) : [];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-baseline justify-between mb-16">
        <span className="text-sm tracking-tight">BLOCK27</span>
        <Link
          href="/wardrobe"
          className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
        >
          Wardrobe
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight leading-[0.9] mb-3">
        Outfits.
      </h1>
      <p className="text-ash max-w-md mb-10">
        I read your wardrobe and put pieces together. I only build what actually
        works — and I tell you when it doesn&rsquo;t.
      </p>

      <div className="mb-16">
        <GenerateOutfits />
      </div>

      {outfits.length === 0 ? (
        <p className="text-ash">No outfits yet.</p>
      ) : (
        <ul className="flex flex-col gap-12">
          {outfits.map((o) => (
            <OutfitCard key={o.id} outfit={o} />
          ))}
        </ul>
      )}
    </main>
  );
}

function OutfitCard({ outfit }: { outfit: OutfitView }) {
  return (
    <li className="flex flex-col gap-4 border-t border-iron pt-8 first:border-t-0 first:pt-0">
      <div className="flex gap-1">
        {outfit.items.map((it) => (
          <div
            key={it.id}
            className="w-20 aspect-[3/4] bg-void overflow-hidden border border-iron"
          >
            {it.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.url}
                alt={it.descriptor || "Garment"}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-bone leading-snug max-w-md">{outfit.reasoning}</p>
    </li>
  );
}

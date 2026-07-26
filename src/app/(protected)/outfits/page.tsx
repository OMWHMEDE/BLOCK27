import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listOutfits, type OutfitView } from "@/lib/supabase/storage";
import { GenerateOutfits } from "@/components/GenerateOutfits";
import { RenderOutfit } from "@/components/RenderOutfit";
import { Wordmark } from "@/components/Wordmark";
import { btnNav } from "@/lib/ui";

export default async function OutfitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const outfits = user ? await listOutfits(user.id) : [];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-center justify-between mb-16">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link href="/wardrobe" className={btnNav}>
            Wardrobe
          </Link>
          <Link href="/shopping" className={btnNav}>
            Shop
          </Link>
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
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
        <p className="text-ash max-w-md">
          Nothing built yet. Give me a wardrobe — a few tops and bottoms — and
          I&rsquo;ll put outfits together, then render them on you.
        </p>
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
    <li className="flex flex-col gap-6 border-t border-iron pt-12 first:border-t-0 first:pt-0">
      {/* The hero: you, wearing it. The payoff of the whole product, so it
          rises into place — a reveal, not a thumbnail. */}
      {outfit.renderUrl ? (
        <figure className="reveal">
          <div className="w-full max-w-md aspect-[3/4] bg-void overflow-hidden border border-iron">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outfit.renderUrl}
              alt="You in this outfit"
              className="h-full w-full object-cover"
            />
          </div>
          <figcaption className="text-bone leading-snug max-w-md mt-5">
            {outfit.reasoning}
          </figcaption>
        </figure>
      ) : (
        <p className="text-bone leading-snug max-w-md">{outfit.reasoning}</p>
      )}

      {/* The pieces — the parts, secondary to the whole. */}
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">The pieces</p>
        <div className="flex gap-1">
          {outfit.items.map((it) => (
            <div
              key={it.id}
              className="w-14 aspect-[3/4] bg-void overflow-hidden border border-iron"
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
      </div>

      <RenderOutfit outfitId={outfit.id} hasRender={!!outfit.renderUrl} />
    </li>
  );
}

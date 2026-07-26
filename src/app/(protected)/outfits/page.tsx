import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listOutfits, type OutfitView } from "@/lib/supabase/storage";
import { GenerateOutfits } from "@/components/GenerateOutfits";
import { RenderOutfit } from "@/components/RenderOutfit";
import { RenderHero } from "@/components/RenderHero";
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
  const pieces = (
    <div className="flex gap-1">
      {outfit.items.map((it) => (
        <div
          key={it.id}
          className="w-12 aspect-[3/4] bg-void overflow-hidden border border-iron"
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
  );

  // Rendered: the image is the star. Large, centered, framed by generous black
  // space; the read and the pieces are pushed down, small and secondary.
  if (outfit.renderUrl) {
    return (
      <li className="border-t border-iron py-16 first:border-t-0 first:pt-0">
        <RenderHero src={outfit.renderUrl} alt="You in this outfit" />

        <p className="text-ash text-sm leading-relaxed max-w-sm mx-auto text-center mt-10">
          {outfit.reasoning}
        </p>

        <div className="mt-8 flex justify-center">{pieces}</div>

        <div className="mt-10">
          <RenderOutfit outfitId={outfit.id} hasRender center />
        </div>
      </li>
    );
  }

  // Not rendered yet: compact — the read, the pieces, and the call to reveal.
  return (
    <li className="flex flex-col gap-5 border-t border-iron pt-10 first:border-t-0 first:pt-0">
      <p className="text-bone leading-snug max-w-md">{outfit.reasoning}</p>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">The pieces</p>
        {pieces}
      </div>
      <RenderOutfit outfitId={outfit.id} hasRender={false} />
    </li>
  );
}

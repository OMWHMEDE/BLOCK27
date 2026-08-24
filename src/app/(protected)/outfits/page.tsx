import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listOutfits, type OutfitView } from "@/lib/supabase/storage";
import { getPlan } from "@/lib/plan";
import { GenerateOutfits } from "@/components/GenerateOutfits";
import { GuestOutfits } from "@/components/GuestOutfits";
import { RenderOutfit } from "@/components/RenderOutfit";
import { RenderHero } from "@/components/RenderHero";
import { DownloadRender } from "@/components/DownloadRender";
import { LockField } from "@/components/LockField";
import { AppHeader } from "@/components/AppHeader";
import { paymentsOpen } from "@/lib/payments";
import { isRenderable } from "@/lib/render/categories";

export default async function OutfitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No account — the guest composes one outfit as text; the render stays locked.
  if (!user) {
    return (
      <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
        <AppHeader current="outfits" guest />

        <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
          Outfits.
        </h1>
        <p className="text-ash max-w-md mb-16">
          I put your pieces together and tell you why. One outfit, no account.
        </p>

        <GuestOutfits />
      </main>
    );
  }

  const outfits = await listOutfits(user.id);
  const paid = (await getPlan(user.id)).paid;
  const soon = !paymentsOpen();

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="outfits" />

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
            <OutfitCard key={o.id} outfit={o} paid={paid} soon={soon} />
          ))}
        </ul>
      )}
    </main>
  );
}

function OutfitCard({
  outfit,
  paid,
  soon,
}: {
  outfit: OutfitView;
  paid: boolean;
  soon: boolean;
}) {
  // Pieces the hand can't place on the body (shoes, accessories). Named
  // honestly on the render so their own shoes are never mistaken for the pick.
  const unplaced = outfit.items.filter((it) => !isRenderable(it.category));

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

        {unplaced.length > 0 ? (
          <p className="text-ash text-xs leading-snug max-w-sm mx-auto text-center mt-6">
            Not on the render — I can&rsquo;t place these on you yet, so your own
            stay:{" "}
            <span className="text-bone">
              {unplaced.map((u) => u.descriptor || u.category).join(", ")}
            </span>
            .
          </p>
        ) : null}

        <div className="mt-8 flex justify-center">{pieces}</div>

        <div className="mt-10 flex flex-col items-center gap-4">
          {paid ? (
            <RenderOutfit outfitId={outfit.id} hasRender center />
          ) : soon ? (
            <span className="text-xs uppercase tracking-[0.08em] text-ash">
              Re-render opens soon.
            </span>
          ) : (
            <Link
              href="/pricing"
              className="text-xs uppercase tracking-[0.08em] text-ash underline underline-offset-4 hover:text-paper"
            >
              Re-render is paid. Upgrade.
            </Link>
          )}
          <DownloadRender outfitId={outfit.id} />
        </div>
      </li>
    );
  }

  // Not rendered yet: compact — the read, the pieces, and the payoff. Paid
  // accounts get the render button; free accounts get the block, locked. The
  // hand never runs for a free account — this is the whole gate, made visible.
  return (
    <li className="flex flex-col gap-5 border-t border-iron pt-10 first:border-t-0 first:pt-0">
      <p className="text-bone leading-snug max-w-md">{outfit.reasoning}</p>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">The pieces</p>
        {pieces}
      </div>
      {paid ? (
        <RenderOutfit outfitId={outfit.id} hasRender={false} />
      ) : (
        <LockField
          className="w-full max-w-xs aspect-[3/4]"
          message="Seeing it on you is paid."
          label="See it on you — locked. Upgrade to unlock."
          soon={soon}
        />
      )}
    </li>
  );
}

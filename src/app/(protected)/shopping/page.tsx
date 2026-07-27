import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listRecommendations,
  type RecommendationView,
} from "@/lib/supabase/storage";
import { ShopGaps } from "@/components/ShopGaps";
import { Wordmark } from "@/components/Wordmark";
import { btnNav } from "@/lib/ui";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recs = user ? await listRecommendations(user.id) : [];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-center justify-between mb-16">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link href="/wardrobe" className={btnNav}>
            Wardrobe
          </Link>
          <Link href="/outfits" className={btnNav}>
            Outfits
          </Link>
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        What to buy.
      </h1>
      <p className="text-ash max-w-md mb-10">
        I read your wardrobe and find the one or two pieces that would unlock the
        most new outfits. If you don&rsquo;t need anything, I&rsquo;ll tell you
        that instead.
      </p>

      <div className="mb-16">
        <ShopGaps hasRecs={recs.length > 0} />
      </div>

      {recs.length === 0 ? (
        <p className="text-ash max-w-md">
          Nothing flagged yet. Run it and I&rsquo;ll name the gaps — or tell you
          the wardrobe&rsquo;s already solid.
        </p>
      ) : (
        <ol className="flex flex-col gap-12">
          {recs.map((r, i) => (
            <RecCard key={r.id} rec={r} n={i + 1} />
          ))}
        </ol>
      )}
    </main>
  );
}

function priceLabel(low: number | null, high: number | null): string | null {
  if (low != null && high != null) return `$${low}–${high}`;
  if (low != null) return `from $${low}`;
  if (high != null) return `up to $${high}`;
  return null;
}

function RecCard({ rec, n }: { rec: RecommendationView; n: number }) {
  const price = priceLabel(rec.price_low, rec.price_high);

  return (
    <li className="border-t border-iron pt-10 first:border-t-0 first:pt-0">
      {/* Index and price frame the entry; the number recedes into iron. */}
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <span className="text-2xl font-bold tabular-nums leading-none text-iron">
          {String(n).padStart(2, "0")}
        </span>
        {price ? (
          <span className="text-bone text-sm tabular-nums shrink-0">
            {price}
          </span>
        ) : null}
      </div>

      <h2 className="text-2xl font-bold tracking-tight leading-[0.95] mb-1">
        {rec.title}
      </h2>
      {rec.category ? (
        <p className="text-xs uppercase tracking-[0.08em] text-ash mb-5">
          {rec.category}
        </p>
      ) : null}

      {/* Why it unlocks the most — the brain's read, where the value is. */}
      <p className="text-bone leading-snug max-w-md">{rec.why}</p>

      {rec.look_for ? (
        <p className="text-ash text-sm leading-snug max-w-md mt-4">
          <span className="uppercase tracking-[0.08em] text-xs">Look for</span>{" "}
          — {rec.look_for}
        </p>
      ) : null}
    </li>
  );
}

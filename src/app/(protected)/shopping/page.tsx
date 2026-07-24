import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listRecommendations,
  type RecommendationView,
} from "@/lib/supabase/storage";
import { ShopGaps } from "@/components/ShopGaps";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const recs = user ? await listRecommendations(user.id) : [];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-baseline justify-between mb-16">
        <span className="text-sm tracking-tight">BLOCK27</span>
        <div className="flex items-baseline gap-6">
          <Link
            href="/wardrobe"
            className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
          >
            Wardrobe
          </Link>
          <Link
            href="/outfits"
            className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
          >
            Outfits
          </Link>
        </div>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight leading-[0.9] mb-3">
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
    <li className="flex flex-col gap-3 border-t border-iron pt-8 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-iron text-sm">
            {String(n).padStart(2, "0")}
          </span>
          <h2 className="text-xl font-semibold tracking-tight truncate">
            {rec.title}
          </h2>
        </div>
        {price ? (
          <span className="text-ash text-sm shrink-0">{price}</span>
        ) : null}
      </div>

      {rec.category ? (
        <p className="text-xs uppercase tracking-[0.08em] text-ash">
          {rec.category}
        </p>
      ) : null}

      {/* Why it unlocks the most — the brain's read, where the value is. */}
      <p className="text-bone leading-snug max-w-md">{rec.why}</p>

      {rec.look_for ? (
        <p className="text-ash text-sm leading-snug max-w-md">
          Look for: {rec.look_for}
        </p>
      ) : null}
    </li>
  );
}

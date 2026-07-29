import { createClient } from "@/lib/supabase/server";
import {
  listRecommendations,
  getShoppingSession,
  type RecommendationView,
} from "@/lib/supabase/storage";
import { ShopGaps } from "@/components/ShopGaps";
import { AppHeader } from "@/components/AppHeader";
import { btnNav } from "@/lib/ui";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recs, session] = user
    ? await Promise.all([
        listRecommendations(user.id),
        getShoppingSession(user.id),
      ])
    : [[], null];

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="shop" />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        What to buy.
      </h1>
      <p className="text-ash max-w-md mb-10">
        Tell me the budget. I audit the whole wardrobe as a system, find where
        it&rsquo;s thin, and rank buys by how many outfits each unlocks. If you
        don&rsquo;t need anything, I say so.
      </p>

      <div className="mb-16">
        <ShopGaps hasSession={!!session} />
      </div>

      {!session ? (
        <p className="text-ash max-w-md">
          Nothing run yet. Give me a number and I&rsquo;ll name the gaps — or tell
          you the wardrobe&rsquo;s already solid.
        </p>
      ) : (
        <div className="flex flex-col gap-16">
          {/* The closing read — first, plain, in voice. */}
          {session.advice ? (
            <p className="text-bone leading-snug max-w-md">{session.advice}</p>
          ) : null}

          {/* The money, cold and mono. Unspent budget is a valid answer. */}
          {session.budget != null ? (
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-ash">
              <span className="text-bone">${session.budget}</span> budget
              <span className="text-iron"> · </span>${session.spent} allocated
              <span className="text-iron"> · </span>
              <span className="text-bone">${session.remaining ?? 0}</span> left
            </p>
          ) : null}

          {/* The system audit — the gaps, ranked by leverage. */}
          {session.gaps.length > 0 ? (
            <section>
              <p className="text-xs uppercase tracking-[0.08em] text-ash mb-6">
                Where it&rsquo;s thin
              </p>
              <ol className="flex flex-col">
                {session.gaps.map((g, i) => (
                  <li
                    key={i}
                    className="flex gap-5 border-t border-iron py-5 first:border-t-0 first:pt-0"
                  >
                    <span className="font-mono text-sm tabular-nums text-bone shrink-0 w-14">
                      +{g.unlocks}
                    </span>
                    <div className="min-w-0">
                      <p className="text-bone leading-snug">{g.need}</p>
                      <p className="text-ash text-sm leading-snug mt-1">{g.why}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs uppercase tracking-[0.08em] text-iron">
                outfits each would unlock
              </p>
            </section>
          ) : null}

          {/* The picks — precise enough to shop with, each with a search link. */}
          {recs.length > 0 ? (
            <section>
              <p className="text-xs uppercase tracking-[0.08em] text-ash mb-8">
                What to buy
              </p>
              <ol className="flex flex-col gap-12">
                {recs.map((r, i) => (
                  <RecCard key={r.id} rec={r} n={i + 1} />
                ))}
              </ol>
            </section>
          ) : null}
        </div>
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
      {/* Index left; price and allocated spend right. */}
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <span className="text-2xl font-bold tabular-nums leading-none text-iron">
          {String(n).padStart(2, "0")}
        </span>
        <div className="text-right shrink-0">
          {price ? (
            <span className="text-bone text-sm tabular-nums block">{price}</span>
          ) : null}
          {rec.spend != null && rec.spend > 0 ? (
            <span className="text-ash text-xs uppercase tracking-[0.08em] font-mono block mt-1">
              spend ${rec.spend}
            </span>
          ) : null}
        </div>
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

      {/* The precise, shoppable description — the value of the whole feature. */}
      {rec.look_for ? (
        <p className="text-ash text-sm leading-snug max-w-md mt-4">
          <span className="uppercase tracking-[0.08em] text-xs">Look for</span> —{" "}
          {rec.look_for}
        </p>
      ) : null}

      {rec.link ? (
        <a
          href={rec.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnNav} mt-5`}
        >
          Open search
        </a>
      ) : null}
    </li>
  );
}

import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SiteFooter } from "@/components/SiteFooter";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { paymentsOpen } from "@/lib/payments";
import { TIERS, PAID_TIERS, type PaidTier } from "@/lib/whop/plans";

export const metadata = {
  title: "BLOCK27 — Pricing",
};

// The pricing surface. It reads its numbers straight from TIERS (the one source
// of truth the quota gate and the webhook also read), so a limit is never stated
// twice and can never drift. The three paid tiers stand side by side, equal —
// no card, no shadow, no "most popular" badge, nothing raised above the rest.
// Structure comes from hairlines and space; numerals are mono. Cold facts, in
// the house voice.

function money(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function included(tier: PaidTier): { label: string; value: string }[] {
  const t = TIERS[tier];
  return [
    { label: "Pieces", value: String(t.pieces) },
    { label: "Compositions", value: `${t.compositionsPerMonth} / mo` },
    { label: "Try-ons", value: `${t.tryOnsPerMonth} / mo` },
    { label: "Shopping", value: `${t.shoppingPerMonth} / mo` },
  ];
}

export default function PricingPage() {
  const open = paymentsOpen();
  const free = TIERS.free;

  return (
    <>
      <main className="flex flex-1 flex-col px-8 py-16 max-w-5xl w-full mx-auto">
        <Link href="/" className="mb-16 inline-block">
          <Wordmark />
        </Link>

        <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
          Pricing.
        </h1>
        <p className="text-ash max-w-md mb-4 leading-snug">
          The wardrobe and the stylist are free. The try-on — seeing the outfit
          on your own body — is what you pay for.
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-ash">
          Prices in USD, per month
        </p>

        {/* Free — the starting line, not a fourth column competing with the paid
            tiers. Stated once, quietly, so the row stays three equal plans. */}
        <p className="mt-10 border-t border-iron pt-8 max-w-2xl text-sm leading-snug text-bone">
          <span className="font-mono text-paper">Free</span> — {free.pieces}{" "}
          pieces, the stylist, {free.compositionsPerMonth} compositions a month.
          No try-ons. Start there.
        </p>

        {/* The three paid tiers. Side by side on wide screens, stacked on mobile.
            Vertical hairlines between columns on desktop; a top hairline between
            stacked blocks on mobile. No box, no radius, nothing floating. */}
        <div className="mt-4 grid grid-cols-1 border-t border-iron md:grid-cols-3 md:divide-x md:divide-iron">
          {PAID_TIERS.map((tier) => {
            const t = TIERS[tier];
            return (
              <section
                key={tier}
                className="flex flex-col border-t border-iron py-10 first:border-t-0 md:border-t-0 md:px-8 md:first:pl-0 md:last:pr-0"
              >
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">
                  {t.label}
                </h2>
                <p className="mt-3 font-mono text-lg text-paper tabular-nums">
                  {money(t.priceUsd)}
                  <span className="text-ash">/mo</span>
                </p>

                <dl className="mt-8 flex flex-col">
                  {included(tier).map((r) => (
                    <div
                      key={r.label}
                      className="flex items-baseline justify-between gap-4 border-b border-iron/60 py-3 last:border-0"
                    >
                      <dt className="text-sm uppercase tracking-[0.08em] text-ash">
                        {r.label}
                      </dt>
                      <dd className="font-mono tabular-nums text-paper">
                        {r.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* CTA sits at the bottom so all three align regardless of copy.
                    Open: the tier routes to its checkout. Closed: a calm block,
                    not a shut door — the plan still reads, it just can't be
                    bought yet. */}
                <div className="mt-auto pt-8">
                  {open ? (
                    <Link
                      href={`/upgrade?tier=${tier}`}
                      className={`${btnSecondary} w-full`}
                    >
                      Choose {t.label}
                    </Link>
                  ) : (
                    <p className="border border-iron py-3 text-center text-xs uppercase tracking-[0.16em] text-ash">
                      Coming soon
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-12 border-t border-iron pt-8 max-w-md text-sm leading-snug text-ash">
          A try-on renders the chosen outfit onto your own base photo. A failed
          render never counts against your allowance and is never charged.
        </p>

        <div className="mt-12 flex justify-center">
          <Link href="/wardrobe" className={btnPrimary}>
            Try it now
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

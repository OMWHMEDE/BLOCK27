import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export const metadata = {
  title: "BLOCK27 — Pricing",
};

// Four plans, stacked as hairline-separated blocks — a spec sheet, not a
// pricing-table template: no cards, no shadow, no "most popular" badge, mono
// numerals for every price and limit. Cold facts, in the house voice.
type Plan = {
  name: string;
  price: string;
  cadence: string;
  note: string;
  rows: { label: string; value: string }[];
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "",
    note: "The stylist, on your own wardrobe. See what it says before you pay.",
    rows: [
      { label: "Pieces", value: "15" },
      { label: "Outfit compositions", value: "Included" },
      { label: "Try-ons", value: "0" },
    ],
  },
  {
    name: "Premium",
    price: "$14.99",
    cadence: "/mo",
    note: "Start seeing outfits on your own body.",
    rows: [
      { label: "Pieces", value: "30" },
      { label: "Outfit compositions", value: "10 / mo" },
      { label: "Try-ons", value: "5 / mo" },
    ],
  },
  {
    name: "Pro",
    price: "$24.99",
    cadence: "/mo",
    note: "A full wardrobe, worked hard.",
    rows: [
      { label: "Pieces", value: "60" },
      { label: "Outfit compositions", value: "20 / mo" },
      { label: "Try-ons", value: "10 / mo" },
    ],
  },
  {
    name: "Boss",
    price: "$49.99",
    cadence: "/mo",
    note: "Everything, no thinking about limits.",
    rows: [
      { label: "Pieces", value: "100" },
      { label: "Outfit compositions", value: "45 / mo" },
      { label: "Try-ons", value: "20 / mo" },
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <Link href="/" className="mb-16 inline-block">
        <Wordmark />
      </Link>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Pricing.
      </h1>
      <p className="text-ash max-w-md mb-4 leading-snug">
        Four plans. The wardrobe and the stylist are free; the try-on — seeing
        the outfit on your own body — is what you pay for.
      </p>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-ash mb-4">
        Prices in USD
      </p>

      <div>
        {PLANS.map((p) => (
          <section key={p.name} className="border-t border-iron py-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-3xl font-black uppercase tracking-[-0.03em]">
                {p.name}
              </h2>
              <p className="whitespace-nowrap font-mono text-lg text-paper tabular-nums">
                {p.price}
                <span className="text-ash">{p.cadence}</span>
              </p>
            </div>

            <p className="mt-3 mb-6 max-w-md text-sm leading-snug text-ash">
              {p.note}
            </p>

            <dl className="flex flex-col">
              {p.rows.map((r) => (
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

            {/* Paid tiers link to the authed checkout (/upgrade). A logged-out
                visitor is bounced to /login by the proxy first. */}
            {p.name !== "Free" ? (
              <Link
                href={`/upgrade?tier=${p.name.toLowerCase()}`}
                className={`${btnSecondary} mt-6`}
              >
                Choose {p.name}
              </Link>
            ) : null}
          </section>
        ))}
      </div>

      <p className="border-t border-iron pt-8 max-w-md text-sm leading-snug text-ash">
        A try-on renders the chosen outfit onto your own base photo. A failed
        render never counts against your allowance and is never charged.
      </p>

      <div className="mt-12 flex justify-center">
        <Link href="/wardrobe" className={btnPrimary}>
          Try it now
        </Link>
      </div>

      <nav className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-iron pt-8 text-sm">
        <Link
          href="/terms"
          className="uppercase tracking-[0.08em] text-bone hover:text-paper"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="uppercase tracking-[0.08em] text-bone hover:text-paper"
        >
          Privacy
        </Link>
        <Link
          href="/refund"
          className="uppercase tracking-[0.08em] text-bone hover:text-paper"
        >
          Refund
        </Link>
        <Link
          href="/"
          className="uppercase tracking-[0.08em] text-bone hover:text-paper"
        >
          Home
        </Link>
      </nav>
    </main>
  );
}

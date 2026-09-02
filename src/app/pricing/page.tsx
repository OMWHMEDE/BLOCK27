import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SiteFooter } from "@/components/SiteFooter";
import { TiledField } from "@/components/TiledField";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import { paymentsOpen } from "@/lib/payments";
import { SUPPORT_EMAIL } from "@/lib/support";
import { TIERS, TIER_ORDER, type Tier } from "@/lib/whop/plans";

export const metadata = {
  title: "BLOCK27 — Membership",
};

// The membership page. Four levels side by side on the faint 27 field: Free is a
// full card, Pro is reversed out of a paper block (the house device) to mark it
// recommended without a badge or a second colour. Every number reads from TIERS,
// so pricing here can never drift from the quota gate or the webhook. CTAs hand
// off to the Whop checkout at /upgrade; when payments are closed each paid CTA
// becomes the calm "coming soon" instead. Structure is hairlines and space, mono
// numerals, border-radius 0 — no gradients, no glow.

function price(usd: number): string {
  return usd === 0 ? "$0" : `$${usd.toFixed(2)}`;
}

function features(t: Tier): string[] {
  const c = TIERS[t];
  return [
    `${c.pieces} pieces`,
    `${c.compositionsPerMonth} outfit generations`,
    c.tryOnsPerMonth === 0 ? "No try-ons" : `${c.tryOnsPerMonth} try-ons / mo`,
    `${c.shoppingPerMonth} shop recs / mo`,
  ];
}

export default function PricingPage() {
  const open = paymentsOpen();

  return (
    <>
      <div className="relative isolate flex flex-1 flex-col">
        <TiledField />

        <main className="relative flex flex-1 flex-col px-6 py-16 sm:px-8 max-w-6xl w-full mx-auto">
          <Link href="/" className="mb-16 inline-block">
            <Wordmark />
          </Link>

          <h1 className="text-5xl font-black uppercase leading-[0.85] tracking-[-0.04em] sm:text-6xl">
            Choose your level.
          </h1>
          <p className="mt-6 max-w-lg leading-snug text-ash">
            Your wardrobe and stylist are free to start. Pay for more wardrobe
            capacity, more outfit generations, and the try-on — seeing the outfit
            on your own body.
          </p>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-ash">
            Billed monthly <span className="text-iron">·</span> Cancel anytime{" "}
            <span className="text-iron">·</span> Secure checkout
          </p>

          {/* The four levels. One column on mobile, two on small, four on wide. */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIER_ORDER.map((t) => (
              <TierCard key={t} tier={t} open={open} />
            ))}
          </div>

          <TrustRow />
          <HowTryOnsWork />
          <Faqs />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

function TierCard({ tier, open }: { tier: Tier; open: boolean }) {
  const c = TIERS[tier];
  const isFree = tier === "free";
  const isPro = tier === "pro";

  return (
    <section
      className={`flex flex-col bg-void ${isPro ? "border border-paper" : "border border-iron"}`}
    >
      {/* Header. Pro reverses out of a solid paper block — recommended, stated
          in the house device, not a coloured pill. */}
      {isPro ? (
        <div className="bg-paper px-6 pt-4 pb-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-void/70">
            Recommended
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.03em] text-void">
            {c.label}
          </h2>
        </div>
      ) : (
        <div className="px-6 pt-6">
          <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-paper">
            {c.label}
          </h2>
        </div>
      )}

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        <p className="font-mono text-2xl tabular-nums text-paper">
          {price(c.priceUsd)}
          <span className="text-sm text-ash">/mo</span>
        </p>

        <ul className="mt-6 flex flex-col gap-2 border-t border-iron pt-6 text-sm leading-snug text-bone">
          {features(tier).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        <div className="mt-8 pt-2">
          {isFree ? (
            <>
              <Link href="/signup" className={`${btnSecondary} w-full`}>
                Start free
              </Link>
              <p className="mt-3 text-center text-xs uppercase tracking-[0.08em] text-ash">
                No payment required
              </p>
            </>
          ) : open ? (
            <Link
              href={`/upgrade?tier=${tier}`}
              className={`${isPro ? btnPrimary : btnSecondary} w-full`}
            >
              Choose {c.label}
            </Link>
          ) : (
            <p className="border border-iron py-3 text-center text-xs uppercase tracking-[0.16em] text-ash">
              Coming soon
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function TrustRow() {
  const items = [
    { icon: <LockIcon />, label: "Secure payments", note: "Handled by Whop" },
    { icon: <CycleIcon />, label: "Cancel anytime", note: "Access to period end" },
    { icon: <ShieldIcon />, label: "Private by design", note: "Encrypted, yours to delete" },
    { icon: <HeadsetIcon />, label: "Support available", note: SUPPORT_EMAIL },
  ];
  return (
    <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-iron pt-10 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-iron">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex flex-col gap-3 lg:px-6 lg:first:pl-0 lg:last:pr-0"
        >
          <span className="text-bone">{it.icon}</span>
          <span>
            <span className="block text-xs uppercase tracking-[0.06em] text-paper">
              {it.label}
            </span>
            <span className="mt-1 block break-words text-xs text-ash">
              {it.note}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function HowTryOnsWork() {
  return (
    <div className="mt-24 flex flex-col gap-8 border-t border-iron pt-10 sm:flex-row sm:items-start sm:gap-12">
      <PhoneFigure />
      <div className="max-w-md">
        <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-paper">
          How try-ons work
        </h2>
        <p className="mt-4 leading-relaxed text-ash">
          A try-on renders the chosen outfit onto your own base photo, at full
          quality — so everything rides on that base photo. Shoot it full-body,
          plain wall, good light; we show you exactly how. It rarely goes wrong,
          but a finished try-on counts toward your allowance, so start from a base
          you&rsquo;re happy with.
        </p>
        <Link
          href="/wardrobe"
          className="mt-6 inline-block text-xs uppercase tracking-[0.08em] text-bone underline underline-offset-4 hover:text-paper"
        >
          Try it now →
        </Link>
      </div>
    </div>
  );
}

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: `Yes. Your plan is billed through Whop, our payment processor. Cancel any time through Whop or by emailing ${SUPPORT_EMAIL} — billing stops and your access runs to the end of the period you have already paid for.`,
  },
  {
    q: "Can I get a refund?",
    a: "Only if you haven't used a try-on. The stylist is free to try first, so you can see BLOCK27 work before you pay. Once you've rendered an outfit on a paid plan, that's a real cost on our side and the charge isn't refundable. Full details are in the Refund policy.",
  },
  {
    q: "What if a try-on comes out wrong?",
    a: "It rarely happens, and we're sorry when it does. A try-on is built on your base photo, so a weak base is almost always the cause — shoot it full-body, plain wall, good light (we show you exactly how). A finished try-on counts toward your allowance, so start from a base you're happy with. If something genuinely breaks on our side, it's retried automatically.",
  },
  {
    q: "How do outfit generations work?",
    a: "The stylist reads your wardrobe as text and composes outfits up to your plan's monthly allowance. The try-on is the separate, paid step that renders one onto your body.",
  },
];

function Faqs() {
  return (
    <div className="mt-24">
      <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-paper">
        FAQs
      </h2>
      <div className="mt-8">
        {FAQ.map((f) => (
          <details
            key={f.q}
            className="group border-t border-iron last:border-b"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
              <span className="text-bone">{f.q}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-ash transition-transform duration-200 group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="max-w-2xl pb-6 pr-8 text-sm leading-relaxed text-ash">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

// A small monochrome phone with a standing figure — a physical object, so a
// little corner rounding is allowed (the one place the brand permits it).
function PhoneFigure() {
  return (
    <svg
      viewBox="0 0 96 132"
      className="h-32 w-auto shrink-0 text-iron"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="8" y="4" width="80" height="124" rx="10" />
      <line x1="40" y1="14" x2="56" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <g className="text-ash" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="48" cy="42" r="8" />
        <path d="M34 92c0-12 4-24 14-24s14 12 14 24" />
        <path d="M40 92v22M56 92v22" />
      </g>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function CycleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 1 2.3 5.6" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M20 19a5 5 0 0 1-5 4h-3" />
    </svg>
  );
}

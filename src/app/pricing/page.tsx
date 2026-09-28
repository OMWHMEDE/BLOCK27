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

// The membership page. Two levels side by side on the faint 27 field: Free is a
// full card, BLOCK27 is reversed out of a paper block (the house device) to mark
// it recommended without a badge or a second colour. Every number reads from
// TIERS, so pricing here can never drift from the quota gate or the webhook. CTAs
// hand off to the Whop checkout at /upgrade; when payments are closed each paid CTA
// becomes the calm "coming soon" instead. Structure is hairlines and space, mono
// numerals, border-radius 0 — no gradients, no glow.

function price(usd: number): string {
  return usd === 0 ? "$0" : `$${usd.toFixed(2)}`;
}

function features(t: Tier): string[] {
  const c = TIERS[t];
  return [
    `${c.pieces} pieces`,
    `${c.compositionsPerMonth} outfit generations / mo`,
    `${c.shoppingPerMonth} shopping consultations / mo`,
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
            Your wardrobe and stylist are free to start. Upgrade for far more
            wardrobe capacity, more outfit generations, and more shopping
            consultations each month.
          </p>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-ash">
            Monthly or yearly <span className="text-iron">·</span> Cancel anytime{" "}
            <span className="text-iron">·</span> Secure checkout
          </p>

          {/* The two levels. One column on mobile, two side by side above. */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-3xl">
            {TIER_ORDER.map((t) => (
              <TierCard key={t} tier={t} open={open} />
            ))}
          </div>

          <TrustRow />
        </main>
      </div>
      <SiteFooter />
    </>
  );
}

function TierCard({ tier, open }: { tier: Tier; open: boolean }) {
  const c = TIERS[tier];
  const isFree = tier === "free";
  const isPaid = tier === "block27";

  return (
    <section
      className={`flex flex-col bg-void ${isPaid ? "border border-paper" : "border border-iron"}`}
    >
      {/* Header. The paid tier reverses out of a solid paper block — recommended,
          stated in the house device, not a coloured pill. */}
      {isPaid ? (
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
        {c.priceYearlyUsd > 0 ? (
          <p className="mt-1 font-mono text-xs tabular-nums text-ash">
            or {price(c.priceYearlyUsd)}/yr
          </p>
        ) : null}

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
              href="/upgrade"
              className={`${isPaid ? btnPrimary : btnSecondary} w-full`}
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

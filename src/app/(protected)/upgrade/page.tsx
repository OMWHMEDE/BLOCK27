import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { WhopCheckout } from "@/components/WhopCheckout";
import { btnNav, btnSecondary } from "@/lib/ui";
import {
  PAID_TIERS,
  TIERS,
  whopPlanId,
  isTier,
  type PaidTier,
} from "@/lib/whop/plans";

// The authed plan-selection + checkout screen. Only tiers whose Whop plan id is
// configured are offered; picking one (?tier=pro) renders Whop's embedded
// checkout for the signed-in user. Protected — the proxy bounces guests to
// /login before this renders.
export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tier: raw } = await searchParams;
  const available = PAID_TIERS.filter((t) => whopPlanId(t) !== null);
  const selected: PaidTier | null =
    raw && isTier(raw) && raw !== "free" && available.includes(raw)
      ? raw
      : null;

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="settings" />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Upgrade.
      </h1>

      {available.length === 0 ? (
        <NotLiveYet />
      ) : selected ? (
        <SelectedTier tier={selected} />
      ) : (
        <TierPicker available={available} />
      )}
    </main>
  );
}

function money(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function NotLiveYet() {
  return (
    <div className="mt-4">
      <p className="text-ash max-w-md leading-snug mb-8">
        Paid plans aren&rsquo;t live yet. The wardrobe and the stylist are free
        in the meantime.
      </p>
      <Link href="/pricing" className={btnSecondary}>
        See pricing
      </Link>
    </div>
  );
}

function TierPicker({ available }: { available: PaidTier[] }) {
  return (
    <>
      <p className="text-ash max-w-md mb-12 leading-snug">
        Pick a plan. You pay for the try-on — seeing the outfit on your own body.
      </p>
      <div>
        {available.map((tier) => {
          const t = TIERS[tier];
          return (
            <Link
              key={tier}
              href={`/upgrade?tier=${tier}`}
              className="group flex items-baseline justify-between gap-4 border-t border-iron py-6 hover:bg-iron/20"
            >
              <span className="flex items-baseline gap-3">
                <span className="text-2xl font-black uppercase tracking-[-0.03em]">
                  {t.label}
                </span>
                <span className="text-ash text-sm">
                  {t.pieces} pieces · {t.tryOnsPerMonth} try-ons/mo
                </span>
              </span>
              <span className="whitespace-nowrap font-mono text-paper tabular-nums">
                {money(t.priceUsd)}
                <span className="text-ash">/mo</span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-10 border-t border-iron pt-8 text-sm text-ash">
        <Link href="/pricing" className="text-bone hover:text-paper underline underline-offset-4">
          Full plan details
        </Link>
      </p>
    </>
  );
}

function SelectedTier({ tier }: { tier: PaidTier }) {
  const t = TIERS[tier];
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-t border-iron pt-8 mb-8">
        <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">
          {t.label}
        </h2>
        <p className="whitespace-nowrap font-mono text-lg text-paper tabular-nums">
          {money(t.priceUsd)}
          <span className="text-ash">/mo</span>
        </p>
      </div>

      <WhopCheckout tier={tier} />

      <div className="mt-10">
        <Link href="/upgrade" className={btnNav}>
          Back
        </Link>
      </div>
    </>
  );
}

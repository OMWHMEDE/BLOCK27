import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { WhopCheckout } from "@/components/WhopCheckout";
import { btnNav, btnSecondary } from "@/lib/ui";
import { paymentsOpen } from "@/lib/payments";
import { TIERS, whopPlanId, type BillingPeriod } from "@/lib/whop/plans";

// The authed checkout screen. There is one paid tier (BLOCK27), billed monthly or
// yearly; a period is offered only when its Whop plan id is configured. Picking a
// period (?period=yearly) renders Whop's embedded checkout for the signed-in user.
// Protected — the proxy bounces guests to /login before this renders.
const PAID = "block27" as const;

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { period: raw } = await searchParams;
  // Closed for business until payments are verified, or no plan is wired up yet:
  // either way there is nothing to buy, so the whole screen is the calm coming
  // -soon state — never a checkout that leads to a shut door.
  const open = paymentsOpen();
  const periods: BillingPeriod[] = open
    ? (["monthly", "yearly"] as BillingPeriod[]).filter(
        (p) => whopPlanId(PAID, p) !== null,
      )
    : [];
  const selected: BillingPeriod | null =
    (raw === "monthly" || raw === "yearly") && periods.includes(raw) ? raw : null;

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="settings" />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Upgrade.
      </h1>

      {periods.length === 0 ? (
        <NotLiveYet />
      ) : selected ? (
        <SelectedPlan period={selected} />
      ) : (
        <PeriodPicker periods={periods} />
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
        Membership opens soon. The wardrobe and the stylist are free in the
        meantime.
      </p>
      <Link href="/pricing" className={btnSecondary}>
        See the plans
      </Link>
    </div>
  );
}

function PeriodPicker({ periods }: { periods: BillingPeriod[] }) {
  const t = TIERS[PAID];
  const row: Record<BillingPeriod, { label: string; price: string; unit: string }> = {
    monthly: { label: "Monthly", price: money(t.priceUsd), unit: "/mo" },
    yearly: { label: "Yearly", price: money(t.priceYearlyUsd), unit: "/yr" },
  };
  return (
    <>
      <p className="text-ash max-w-md mb-12 leading-snug">
        One membership. {t.pieces} pieces, {t.compositionsPerMonth} outfit
        generations and {t.shoppingPerMonth} shopping consultations a month.
        Billed how you like.
      </p>
      <div>
        {periods.map((p) => (
          <Link
            key={p}
            href={`/upgrade?period=${p}`}
            className="group flex items-baseline justify-between gap-4 border-t border-iron py-6 hover:bg-iron/20"
          >
            <span className="text-2xl font-black uppercase tracking-[-0.03em]">
              {row[p].label}
            </span>
            <span className="whitespace-nowrap font-mono text-paper tabular-nums">
              {row[p].price}
              <span className="text-ash">{row[p].unit}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-10 border-t border-iron pt-8 text-sm text-ash">
        <Link
          href="/pricing"
          className="text-bone hover:text-paper underline underline-offset-4"
        >
          Full plan details
        </Link>
      </p>
    </>
  );
}

function SelectedPlan({ period }: { period: BillingPeriod }) {
  const t = TIERS[PAID];
  const isYearly = period === "yearly";
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-t border-iron pt-8 mb-8">
        <h2 className="text-2xl font-black uppercase tracking-[-0.03em]">
          {t.label}
        </h2>
        <p className="whitespace-nowrap font-mono text-lg text-paper tabular-nums">
          {money(isYearly ? t.priceYearlyUsd : t.priceUsd)}
          <span className="text-ash">{isYearly ? "/yr" : "/mo"}</span>
        </p>
      </div>

      <WhopCheckout tier={PAID} period={period} />

      <div className="mt-10">
        <Link href="/wardrobe" className={btnNav}>
          Back to wardrobe
        </Link>
      </div>
    </>
  );
}

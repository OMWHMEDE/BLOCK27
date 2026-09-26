import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwner } from "@/lib/owner";
import { Field27 } from "@/components/Field27";
import { AutoRefresh } from "./AutoRefresh";
import { TIERS } from "@/lib/whop/plans";

// The private owner dashboard. Gated on the owner's user id (OWNER_UID or
// PAID_OVERRIDE_UIDS); everyone else — signed in or not — gets a 404, so the page
// never announces itself. Reads across ALL users via the service-role client
// (owner-only, server-side), and shows COUNTS and metadata only — never a user
// photo (privacy rule). Always fresh, no caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const RENDER_COST_USD = 0.9; // ~$0.90 per full outfit render (FASHN, est.)

async function n(query: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await query;
  return count ?? 0;
}

type Signup = { email: string; created_at: string; tier: string };

async function load(admin: SupabaseClient) {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const startOfTodayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startOfMonthUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const last7 = new Date(now.getTime() - 7 * 86_400_000);
  const last30 = new Date(now.getTime() - 30 * 86_400_000);
  const last24h = new Date(now.getTime() - 86_400_000);

  // public.users is 1:1 with auth (a signup trigger inserts a row in the same
  // transaction), and its created_at is the signup time — so it's the source for
  // counts and signup windows, and it's reachable by the service role (the auth
  // schema is not exposed over the API). Emails come from the admin auth API.
  const pub = (t: string) => admin.from(t);
  const headCount = { count: "exact" as const, head: true };

  const [
    usersTotal,
    usersToday,
    usersWeek,
    usersMonth,
    premium,
    pro,
    boss,
    garmentsTotal,
    garments24,
    outfitsTotal,
    outfits24,
    rendersTotal,
    renders24,
    rendersMonth,
    jobsQueued,
    jobsProcessing,
    jobsDone,
    jobsFailed,
  ] = await Promise.all([
    n(pub("users").select("id", headCount)),
    n(pub("users").select("id", headCount).gte("created_at", iso(startOfTodayUTC))),
    n(pub("users").select("id", headCount).gte("created_at", iso(last7))),
    n(pub("users").select("id", headCount).gte("created_at", iso(last30))),
    n(pub("users").select("id", headCount).eq("plan_tier", "premium")),
    n(pub("users").select("id", headCount).eq("plan_tier", "pro")),
    n(pub("users").select("id", headCount).eq("plan_tier", "boss")),
    n(pub("garments").select("id", headCount)),
    n(pub("garments").select("id", headCount).gte("created_at", iso(last24h))),
    n(pub("outfits").select("id", headCount)),
    n(pub("outfits").select("id", headCount).gte("created_at", iso(last24h))),
    n(pub("renders").select("id", headCount)),
    n(pub("renders").select("id", headCount).gte("created_at", iso(last24h))),
    n(pub("renders").select("id", headCount).gte("created_at", iso(startOfMonthUTC))),
    n(pub("jobs").select("id", headCount).eq("status", "queued")),
    n(pub("jobs").select("id", headCount).eq("status", "processing")),
    n(pub("jobs").select("id", headCount).eq("status", "done")),
    n(pub("jobs").select("id", headCount).eq("status", "failed")),
  ]);

  // Recent signups: newest 10 from public.users (id, tier, when), with each email
  // fetched from the admin auth API (public.users holds no email).
  const { data: recentRows } = await pub("users")
    .select("id, plan_tier, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const recent = (recentRows ?? []) as {
    id: string;
    plan_tier: string | null;
    created_at: string;
  }[];
  const signups: Signup[] = await Promise.all(
    recent.map(async (r) => {
      const { data } = await admin.auth.admin.getUserById(r.id);
      return {
        email: data?.user?.email ?? "—",
        created_at: r.created_at,
        tier: r.plan_tier ?? "free",
      };
    }),
  );

  const mrr =
    premium * TIERS.premium.priceUsd +
    pro * TIERS.pro.priceUsd +
    boss * TIERS.boss.priceUsd;
  const payingTotal = premium + pro + boss;

  return {
    now,
    usersTotal,
    usersToday,
    usersWeek,
    usersMonth,
    premium,
    pro,
    boss,
    payingTotal,
    mrr,
    garmentsTotal,
    garments24,
    outfitsTotal,
    outfits24,
    rendersTotal,
    renders24,
    rendersMonth,
    renderCost: rendersMonth * RENDER_COST_USD,
    jobsQueued,
    jobsProcessing,
    jobsDone,
    jobsFailed,
    signups,
  };
}

export default async function OwnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  // TEMPORARY DEBUG — remove once the /owner 404 is diagnosed. Prints both sides
  // of the gate so it's clear which check fails. Look for "[owner-debug]" in the
  // Vercel logs for the /owner route. Logs an id and env values, no secrets.
  console.log("[owner-debug] session user id:", user?.id ?? null);
  console.log("[owner-debug] getUser error:", authErr?.message ?? null);
  console.log(
    "[owner-debug] OWNER_UID raw:",
    JSON.stringify(process.env.OWNER_UID ?? null),
  );
  console.log(
    "[owner-debug] PAID_OVERRIDE_UIDS raw:",
    JSON.stringify(process.env.PAID_OVERRIDE_UIDS ?? null),
  );
  console.log("[owner-debug] isOwner result:", isOwner(user?.id));

  // Not the owner → 404. Same response for signed-out, signed-in-but-not-owner,
  // and a non-existent page, so this URL never reveals it exists.
  if (!isOwner(user?.id)) notFound();

  const d = await load(createAdminClient());
  const fmt = (x: number) => x.toLocaleString("en-US");
  const money = (x: number) =>
    x.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <main className="relative min-h-screen bg-void text-paper overflow-hidden">
      <AutoRefresh seconds={30} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <Field27 />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-6 py-12 md:px-10 md:py-16">
        {/* Header line — terminal, not SaaS. */}
        <div className="flex items-baseline justify-between border-b border-iron pb-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ash">
            BLOCK27 <span className="text-iron">{"//"}</span> OWNER
          </p>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ash">
            {d.now.toISOString().replace("T", " ").slice(0, 19)} UTC
          </p>
        </div>

        {/* USERS */}
        <Section label="Users">
          <Big value={fmt(d.usersTotal)} />
          <Trio
            items={[
              ["Today", fmt(d.usersToday)],
              ["7 days", fmt(d.usersWeek)],
              ["30 days", fmt(d.usersMonth)],
            ]}
          />
        </Section>

        {/* REVENUE */}
        <Section label="Monthly recurring revenue">
          <Big value={`$${money(d.mrr)}`} />
          <Trio
            items={[
              ["Premium", fmt(d.premium)],
              ["Pro", fmt(d.pro)],
              ["Boss", fmt(d.boss)],
            ]}
          />
          <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-ash">
            {fmt(d.payingTotal)} paying
          </p>
        </Section>

        {/* WARDROBE VOLUME */}
        <Section label="Volume">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Stat label="Garments" value={fmt(d.garmentsTotal)} sub={`+${fmt(d.garments24)} / 24h`} />
            <Stat label="Outfits" value={fmt(d.outfitsTotal)} sub={`+${fmt(d.outfits24)} / 24h`} />
            <Stat label="Renders" value={fmt(d.rendersTotal)} sub={`+${fmt(d.renders24)} / 24h`} />
          </div>
        </Section>

        {/* RENDER COST */}
        <Section label="Renders this month">
          <Big value={fmt(d.rendersMonth)} />
          <p className="mt-3 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-ash">
            ≈ ${money(d.renderCost)} FASHN cost (${RENDER_COST_USD.toFixed(2)}/render)
          </p>
        </Section>

        {/* JOBS */}
        <Section label="Jobs">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat label="Queued" value={fmt(d.jobsQueued)} alert={d.jobsQueued > 0} />
            <Stat label="Processing" value={fmt(d.jobsProcessing)} />
            <Stat label="Done" value={fmt(d.jobsDone)} />
            <Stat label="Failed" value={fmt(d.jobsFailed)} alert={d.jobsFailed > 0} />
          </div>
        </Section>

        {/* RECENT SIGNUPS */}
        <Section label="Recent signups">
          {d.signups.length === 0 ? (
            <p className="font-mono text-sm text-ash">None yet.</p>
          ) : (
            <ul className="flex flex-col">
              {d.signups.map((s, i) => (
                <li
                  key={`${s.email}-${i}`}
                  className="flex items-center justify-between gap-4 border-t border-iron py-2.5 font-mono text-xs first:border-t-0"
                >
                  <span className="text-ash">
                    {s.created_at.replace("T", " ").slice(0, 16)}
                  </span>
                  <span className="min-w-0 flex-1 truncate px-3 text-bone">{s.email}</span>
                  <span className="uppercase tracking-[0.12em] text-paper">{s.tier}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="mt-16 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-iron">
          Refreshes every 30s · counts across all accounts · no photos, ever
        </p>
      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-iron py-10">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ash">
        {label}
      </p>
      {children}
    </section>
  );
}

// The numbers are the largest thing on the page — heavy grotesque, tight.
function Big({ value }: { value: string }) {
  return (
    <p className="font-black leading-[0.85] tracking-[-0.03em] text-[clamp(3.5rem,14vw,9rem)] tabular-nums">
      {value}
    </p>
  );
}

function Stat({
  label,
  value,
  sub,
  alert = false,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p
        className={`font-black leading-[0.85] tracking-[-0.02em] text-[clamp(2.25rem,6vw,3.75rem)] tabular-nums ${
          alert ? "text-blood" : "text-paper"
        }`}
      >
        {value}
      </p>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-ash">
        {label}
      </p>
      {sub ? (
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-iron">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function Trio({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-5 flex gap-10">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-1">
          <p className="font-black leading-none tracking-[-0.02em] text-[clamp(1.5rem,4vw,2.5rem)] tabular-nums">
            {value}
          </p>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ash">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

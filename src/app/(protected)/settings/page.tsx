import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getBasePhotoUrl } from "@/lib/supabase/storage";
import { getQuota } from "@/lib/quota";
import { getPlan } from "@/lib/plan";
import { AppHeader } from "@/components/AppHeader";
import { LockField } from "@/components/LockField";
import { logout } from "@/app/logout/actions";
import { btnNav, btnSecondary } from "@/lib/ui";
import { EditProfile } from "./EditProfile";
import { ChangeEmail, ChangePassword } from "./Credentials";
import { DeleteAccount } from "./DeleteAccount";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, baseUrl, quota, plan] = user
    ? await Promise.all([
        getProfile(user.id),
        getBasePhotoUrl(user.id),
        getQuota(user.id),
        getPlan(user.id),
      ])
    : [null, null, null, null];
  const paid = plan?.paid ?? false;

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="settings" />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-16">
        Settings.
      </h1>

      <Section label="Profile">
        <EditProfile
          displayName={profile?.displayName ?? null}
          avatarUrl={profile?.avatarUrl ?? null}
        />
      </Section>

      <Section label="Base photo">
        {!paid ? (
          <LockField
            className="w-24 aspect-[3/4]"
            message="Paid feature."
            label="Base photo — locked. Upgrade to unlock."
          />
        ) : (
          <div className="flex items-end gap-5">
            {baseUrl ? (
              <div className="w-24 aspect-[3/4] bg-void overflow-hidden border border-iron">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={baseUrl}
                  alt="Your base photo"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            <Link href="/capture" className={btnSecondary}>
              {baseUrl ? "Change base photo" : "Shoot your base"}
            </Link>
          </div>
        )}
      </Section>

      <Section label="Email">
        <ChangeEmail current={user?.email ?? ""} />
      </Section>

      <Section label="Password">
        <ChangePassword />
      </Section>

      <Section label="Usage">
        {quota ? (
          <>
            {quota.exempt ? (
              <p className="text-ash text-xs uppercase tracking-[0.08em] mb-4">
                Test account — usage limits off
              </p>
            ) : null}
            <dl className="flex flex-col gap-3 font-mono text-sm">
              <QuotaRow
                label="Try-ons this month"
                used={quota.rendersMonth}
                limit={quota.tryOnsPerMonth}
                exempt={quota.exempt}
              />
              <QuotaRow
                label="Pieces"
                used={quota.pieces}
                limit={quota.pieceLimit}
                exempt={quota.exempt}
              />
            </dl>
          </>
        ) : null}
      </Section>

      <Section label="Plan">
        <div className="flex items-center justify-between gap-4 border border-iron px-4 py-3 max-w-sm">
          <div>
            <p className="text-bone">{quota?.tierLabel ?? "Free"}</p>
            <p className="text-ash text-sm mt-0.5">
              {quota
                ? `${quota.tryOnsPerMonth} try-ons/mo · up to ${quota.pieceLimit} pieces`
                : "—"}
            </p>
          </div>
          <Link href="/upgrade" className={btnNav}>
            {quota && quota.tier !== "free" ? "Change" : "Upgrade"}
          </Link>
        </div>
      </Section>

      <Section label="Legal">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/privacy" className={btnNav}>
            Privacy
          </Link>
          <Link href="/terms" className={btnNav}>
            Terms
          </Link>
          <Link href="/refund" className={btnNav}>
            Refund
          </Link>
        </div>
      </Section>

      <Section label="Session">
        <form action={logout}>
          <button type="submit" className={btnSecondary}>
            Log out
          </button>
        </form>
      </Section>

      <Section label="Danger">
        <DeleteAccount />
      </Section>
    </main>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-iron pt-8 pb-12">
      <p className="text-xs uppercase tracking-[0.08em] text-ash mb-6">{label}</p>
      {children}
    </section>
  );
}

function QuotaRow({
  label,
  used,
  limit,
  exempt = false,
}: {
  label: string;
  used: number;
  limit: number;
  exempt?: boolean;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center justify-between gap-4 max-w-sm">
      <dt className="text-ash">{label}</dt>
      <dd className="text-bone tabular-nums">
        {pad(used)} <span className="text-iron">/</span>{" "}
        {exempt ? <span className="text-ash">&#8734;</span> : pad(limit)}
      </dd>
    </div>
  );
}

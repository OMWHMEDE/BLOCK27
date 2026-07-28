import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getBasePhotoUrl } from "@/lib/supabase/storage";
import { getQuota } from "@/lib/quota";
import { AppHeader } from "@/components/AppHeader";
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

  const [profile, baseUrl, quota] = user
    ? await Promise.all([
        getProfile(user.id),
        getBasePhotoUrl(user.id),
        getQuota(user.id),
      ])
    : [null, null, null];

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
      </Section>

      <Section label="Email">
        <ChangeEmail current={user?.email ?? ""} />
      </Section>

      <Section label="Password">
        <ChangePassword />
      </Section>

      <Section label="Usage">
        {quota ? (
          <dl className="flex flex-col gap-3 font-mono text-sm">
            <QuotaRow
              label="Renders today"
              used={quota.rendersToday}
              limit={quota.dailyRenderLimit}
            />
            <QuotaRow
              label="Renders this month"
              used={quota.rendersMonth}
              limit={quota.monthlyRenderLimit}
            />
            <QuotaRow
              label="Pieces"
              used={quota.pieces}
              limit={quota.pieceLimit}
            />
          </dl>
        ) : null}
      </Section>

      <Section label="Plan">
        <div className="flex items-center justify-between gap-4 border border-iron px-4 py-3 max-w-sm">
          <div>
            <p className="text-bone">Free</p>
            <p className="text-ash text-sm mt-0.5">
              3 renders, up to {quota?.pieceLimit ?? "—"} pieces.
            </p>
          </div>
          <span className="text-ash text-xs uppercase tracking-[0.08em] opacity-50">
            Manage — soon
          </span>
        </div>
      </Section>

      <Section label="Legal">
        <div className="flex items-center gap-2">
          <Link href="/privacy" className={btnNav}>
            Privacy
          </Link>
          <Link href="/terms" className={btnNav}>
            Terms
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
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center justify-between gap-4 max-w-sm">
      <dt className="text-ash">{label}</dt>
      <dd className="text-bone tabular-nums">
        {pad(used)} <span className="text-iron">/</span> {pad(limit)}
      </dd>
    </div>
  );
}

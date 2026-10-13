import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SUPPORT_EMAIL } from "@/lib/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribe } from "@/lib/email/unsubscribe";

export const metadata = {
  title: "BLOCK27 — Unsubscribe",
  // Nothing here should be indexed or followed — it is a per-recipient action.
  robots: { index: false, follow: false },
};

// The unsubscribe target for the waitlist confirmation email. The link carries
// the recipient's address (e) and a signed token (t); a valid token flips the
// row's consent flag off via the service-role client (there is deliberately no
// anon write path to the table). The action is idempotent, and it never reveals
// whether an address is actually on the list — any valid-token request shows the
// same confirmation. No read path, no admin screen: this only turns consent off.
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const { e, t } = await searchParams;
  const email = (e ?? "").trim().toLowerCase();
  const ok = verifyUnsubscribe(email, t ?? "");

  if (ok) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("waitlist")
      .update({ consent: false })
      .eq("email", email);
    if (error) {
      console.error("[waitlist] unsubscribe update failed:", error.message);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center max-w-xl w-full mx-auto">
      <Link href="/" className="mb-16 inline-block">
        <Wordmark />
      </Link>

      {ok ? (
        <>
          <h1 className="text-3xl font-bold tracking-tight leading-[0.95] mb-4 text-paper">
            Unsubscribed.
          </h1>
          <p className="text-ash max-w-sm leading-relaxed">
            You won&rsquo;t hear from us about the launch. Nothing else was
            holding your address.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight leading-[0.95] mb-4 text-paper">
            This link isn&rsquo;t valid.
          </h1>
          <p className="text-ash max-w-sm leading-relaxed">
            It may be broken or incomplete. To be removed, email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=unsubscribe`}
              className="text-bone underline underline-offset-4 hover:text-paper"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </>
      )}

      <Link
        href="/"
        className="mt-12 font-mono text-xs uppercase tracking-[0.12em] text-bone hover:text-paper"
      >
        Home
      </Link>
    </main>
  );
}

import Link from "next/link";
import { requestReset } from "./actions";
import { btnPrimary } from "@/lib/ui";

// Step 1 of the reset flow: ask for the email. The result screen (?sent=1) is
// deliberately neutral — it says the same thing whether or not the email has an
// account, so this page can't be used to discover who's registered.
export const metadata = { title: "BLOCK27 — Reset password" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const submitted = sent === "1";

  return (
    <main className="flex flex-1 flex-col justify-center px-8 py-24 max-w-sm w-full mx-auto">
      <h1 className="text-5xl font-black uppercase tracking-[-0.03em] leading-[0.85]">
        BLOCK27
      </h1>

      {submitted ? (
        <>
          <p className="text-ash mt-4 mb-10">Check your inbox.</p>
          <p className="text-bone text-sm border border-iron px-3 py-3 mb-8 leading-snug">
            If an account exists for that email, a reset link is on its way. The
            link expires — use it soon.
          </p>
          <Link
            href="/login"
            className="text-paper hover:text-bone underline underline-offset-4 text-sm"
          >
            Back to login.
          </Link>
        </>
      ) : (
        <>
          <p className="text-ash mt-4 mb-16">
            Enter your email. If there&apos;s an account, a link is on its way.
          </p>

          <form action={requestReset} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-[0.08em] text-ash">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
              />
            </label>

            {error ? (
              <p className="text-blood text-sm border border-blood px-3 py-2">
                {error}
              </p>
            ) : null}

            <button type="submit" className={`${btnPrimary} w-full mt-2`}>
              Send reset link
            </button>
          </form>

          <p className="text-ash text-sm mt-10">
            Remembered it?{" "}
            <Link
              href="/login"
              className="text-paper hover:text-bone underline underline-offset-4"
            >
              Back to login.
            </Link>
          </p>
        </>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import { joinWaitlist } from "./actions";
import styles from "./waitlist.module.css";

export const metadata: Metadata = {
  title: "BLOCK27 — Waitlist",
  description: "An AI stylist for the clothes you already own. Request an invite.",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; error?: string }>;
}) {
  const { joined, error } = await searchParams;

  return (
    <div className={styles.stage}>
      <div className={styles.haze} aria-hidden />
      <div className={styles.haze2} aria-hidden />
      <div className={styles.grain} aria-hidden />

      <main className="relative z-[1] flex flex-1 flex-col justify-center px-8 py-24 max-w-xl w-full mx-auto">
        <p
          className={`text-xs uppercase tracking-[0.35em] text-ash mb-5 ${styles.reveal} ${styles.d1}`}
        >
          BLOCK27
        </p>
        <hr className={`${styles.rule} ${styles.reveal} ${styles.d1} mb-12`} />

        {joined ? (
          <>
            <h1
              className={`text-5xl sm:text-7xl font-bold uppercase tracking-[-0.03em] leading-[0.85] mb-6 ${styles.reveal} ${styles.d2}`}
            >
              You&rsquo;re on the list.
            </h1>
            <p className={`text-ash ${styles.reveal} ${styles.d3}`}>
              We email invites as we open. Watch for it.
            </p>
          </>
        ) : (
          <>
            <h1
              className={`text-5xl sm:text-7xl font-bold uppercase tracking-[-0.03em] leading-[0.85] mb-8 ${styles.reveal} ${styles.d2}`}
            >
              You own good clothes.
            </h1>
            <p
              className={`text-bone text-lg max-w-md mb-14 ${styles.reveal} ${styles.d3}`}
            >
              You wear them wrong. An AI stylist for the clothes already in your
              closet, rendered on your own body. We open in waves.
            </p>

            <form
              action={joinWaitlist}
              className={`flex flex-col gap-4 max-w-sm ${styles.reveal} ${styles.d4}`}
            >
              {error ? (
                <p className="text-blood text-sm border border-blood px-3 py-2">
                  {error}
                </p>
              ) : null}

              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@email.com"
                className="bg-transparent border-b border-iron py-3 text-paper tracking-wide placeholder:text-ash outline-none focus:border-paper"
              />
              <button
                type="submit"
                className="bg-paper text-void py-4 uppercase tracking-[0.15em] text-sm hover:bg-bone"
              >
                Request invite
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

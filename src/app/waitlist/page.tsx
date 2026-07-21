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
      <div className={styles.glow} aria-hidden />
      <div className={styles.haze} aria-hidden />
      <div className={styles.haze2} aria-hidden />
      <div className={styles.vignette} aria-hidden />
      <div className={styles.grain} aria-hidden />

      <main className="relative z-[1] flex flex-1 flex-col items-center justify-center text-center px-6 py-24 w-full">
        {/* The hero: the name, dead center, unmissable. */}
        <h1
          className={`${styles.reveal} ${styles.d1} text-[clamp(2.75rem,16vw,8rem)] font-black uppercase tracking-[-0.04em] leading-[0.82] text-paper`}
        >
          BLOCK27
        </h1>

        <hr className={`${styles.rule} mt-9 mb-20`} />

        {joined ? (
          <>
            <h2
              className={`${styles.reveal} ${styles.d3} text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-[0.95] mb-4 text-paper`}
            >
              You&rsquo;re on the list.
            </h2>
            <p className={`${styles.reveal} ${styles.d3} text-ash max-w-sm`}>
              We email invites as we open. Watch for it.
            </p>
          </>
        ) : (
          <>
            <h2
              className={`${styles.reveal} ${styles.d3} text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-[0.98] mb-5 max-w-md text-paper`}
            >
              You own good clothes. You wear them wrong.
            </h2>
            <p
              className={`${styles.reveal} ${styles.d3} text-bone max-w-sm mb-12`}
            >
              An AI stylist for the clothes already in your closet, rendered on
              your own body. We open in waves.
            </p>

            <form
              action={joinWaitlist}
              className={`${styles.reveal} ${styles.d4} flex flex-col gap-4 w-full max-w-sm`}
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
                className="bg-transparent border-b border-iron py-3 text-center text-paper tracking-wide placeholder:text-ash outline-none focus:border-paper"
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

import type { Metadata } from "next";
import { joinWaitlist } from "./actions";

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
    <main className="flex flex-1 flex-col justify-center px-8 py-24 max-w-xl w-full mx-auto">
      <p className="text-xs uppercase tracking-[0.2em] text-ash mb-10">
        BLOCK27
      </p>

      {joined ? (
        <>
          <h1 className="text-4xl sm:text-5xl font-semibold uppercase tracking-tight leading-[0.9] mb-5">
            You&rsquo;re on the list.
          </h1>
          <p className="text-ash">We email invites as we open. Watch for it.</p>
        </>
      ) : (
        <>
          <h1 className="text-4xl sm:text-5xl font-semibold uppercase tracking-tight leading-[0.9] mb-6">
            You own good clothes.
          </h1>
          <p className="text-bone text-lg max-w-md mb-12">
            You wear them wrong. An AI stylist for the clothes already in your
            closet, rendered on your own body. We open in waves.
          </p>

          <form action={joinWaitlist} className="flex flex-col gap-4 max-w-sm">
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
              className="bg-transparent border-b border-iron py-3 text-paper placeholder:text-ash outline-none focus:border-paper"
            />
            <button
              type="submit"
              className="bg-paper text-void py-3 uppercase tracking-wide text-sm hover:bg-bone"
            >
              Request invite
            </button>
          </form>
        </>
      )}
    </main>
  );
}

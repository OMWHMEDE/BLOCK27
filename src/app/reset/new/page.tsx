import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "../actions";
import { btnPrimary } from "@/lib/ui";

// Step 3: set the new password. Reachable only with the recovery session that
// /reset/confirm established — without it there's nothing to update, so bounce
// back to request a fresh link rather than show a form that can't submit.
export const metadata = { title: "BLOCK27 — New password" };

export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/reset?error=" + encodeURIComponent("This link expired. Request a new one."));
  }

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col justify-center px-8 py-24 max-w-sm w-full mx-auto">
      <h1 className="text-5xl font-black uppercase tracking-[-0.03em] leading-[0.85]">
        BLOCK27
      </h1>
      <p className="text-ash mt-4 mb-16">Set a new password.</p>

      <form action={updatePassword} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-ash">
            New password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.08em] text-ash">
            Confirm password
          </span>
          <input
            type="password"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            className="bg-void border border-iron px-4 py-3 text-paper outline-none transition-colors duration-200 focus:border-paper"
          />
        </label>

        {error ? (
          <p className="text-blood text-sm border border-blood px-3 py-2">
            {error}
          </p>
        ) : null}

        <button type="submit" className={`${btnPrimary} w-full mt-2`}>
          Set password
        </button>
      </form>
    </main>
  );
}

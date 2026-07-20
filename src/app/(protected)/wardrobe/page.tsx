import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBasePhotoUrl } from "@/lib/supabase/storage";
import { logout } from "@/app/logout/actions";

export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = user ? await getBasePhotoUrl(user.id) : null;

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-baseline justify-between mb-24">
        <span className="text-sm tracking-tight">BLOCK27</span>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
          >
            Log out
          </button>
        </form>
      </div>

      <section className="mb-24">
        <p className="text-xs uppercase tracking-[0.08em] text-ash mb-4">
          Your base
        </p>

        {baseUrl ? (
          <div className="flex items-end gap-5">
            <div className="w-32 aspect-[3/4] bg-void overflow-hidden border border-iron">
              {/* Private object via a 300s signed URL; next/image adds nothing. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={baseUrl}
                alt="Your base photo"
                className="h-full w-full object-cover"
              />
            </div>
            <Link
              href="/capture"
              className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper pb-1"
            >
              Retake
            </Link>
          </div>
        ) : (
          <Link
            href="/capture"
            className="inline-flex items-center justify-center border border-iron text-bone px-5 py-3 uppercase tracking-wide text-sm hover:border-paper hover:text-paper"
          >
            Shoot your base
          </Link>
        )}
      </section>

      <h1 className="text-3xl font-semibold tracking-tight leading-[0.9] mb-3">
        {baseUrl ? "The wardrobe comes next." : "One photo, then the wardrobe."}
      </h1>
      <p className="text-ash max-w-md">
        {baseUrl
          ? "Your base is set. Adding clothes is the next step."
          : "Everything is built on your base photo. Shoot it first."}
      </p>

      {user?.email ? (
        <p className="text-iron text-xs mt-16">{user.email}</p>
      ) : null}
    </main>
  );
}

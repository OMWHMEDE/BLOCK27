import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/logout/actions";

export default async function WardrobePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-baseline justify-between mb-24">
        <span className="text-sm tracking-tight">BLOCK27</span>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs uppercase tracking-wide text-paper/50 hover:text-paper"
          >
            Log out
          </button>
        </form>
      </div>

      <h1 className="text-3xl tracking-tight mb-3">Your wardrobe is empty.</h1>
      <p className="text-paper/50 max-w-md">
        Nothing to work with yet. Adding clothes comes next.
      </p>

      {user?.email ? (
        <p className="text-paper/30 text-xs mt-16">{user.email}</p>
      ) : null}
    </main>
  );
}

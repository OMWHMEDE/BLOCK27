import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client, bound to the request's cookies. Uses the anon key and
// therefore acts as the logged-in user under RLS — never a privileged actor.
// Product code reads and writes through this, never through the admin client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh still happens in middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}

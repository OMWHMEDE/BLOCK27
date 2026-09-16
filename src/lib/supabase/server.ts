import { createServerClient } from "@supabase/ssr";
import {
  createClient as createTokenClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
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

// A user-scoped client authenticated by a Supabase access token instead of
// cookies. Uses the anon key and forwards the token on every request, so RLS
// applies as that token's user — never a privileged actor. This is how a native
// client (the React Native app), which holds its session outside cookies,
// authenticates; browser requests keep using the cookie client above.
function createClientWithToken(accessToken: string): SupabaseClient {
  return createTokenClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

// Resolve the request's user together with a client scoped to them. Prefers an
// `Authorization: Bearer <access token>` header (the native app); falls back to
// the cookie session (browser) when no bearer is present. Either path returns a
// user-scoped client under RLS — identical in capability — so callers keep the
// same behavior and RLS scoping. `user` is null when authentication fails, and
// the caller returns 401 exactly as it did before.
export async function authenticateRequest(
  request: Request,
): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const bearer = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1]
    ?.trim();

  if (bearer) {
    const supabase = createClientWithToken(bearer);
    // Validates the token against the auth server (not a local decode); an
    // invalid or expired token yields a null user and a 401 upstream.
    const {
      data: { user },
    } = await supabase.auth.getUser(bearer);
    return { supabase, user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

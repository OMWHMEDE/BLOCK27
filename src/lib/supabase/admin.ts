import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE-ROLE CLIENT — SERVER ONLY.
//
// SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security. It must NEVER reach
// the client bundle. The `server-only` import above makes any client-side
// import a build error, and the key has no NEXT_PUBLIC_ prefix so Next will
// not inline it into browser code.
//
// Product code does NOT use this. It exists for privileged, non-user
// operations only (e.g. an admin needs it to run the RLS test as a setup
// step). Reaching for this in a request handler is almost always a bug — use
// the user-scoped server client and let RLS do its job.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

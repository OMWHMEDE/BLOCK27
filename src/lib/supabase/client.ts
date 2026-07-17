import { createBrowserClient } from "@supabase/ssr";

// Browser client. Only ever uses the public anon key.
// The anon key is safe in the client bundle; RLS is what protects data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

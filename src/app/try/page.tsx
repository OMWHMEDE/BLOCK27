import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestTry } from "@/components/GuestTry";

// Public. A visitor with no account styles three pieces before signing up.
// Someone already logged in has a wardrobe — send them to it.
export default async function TryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/wardrobe");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-8 py-16">
      <h1 className="text-5xl font-black uppercase leading-[0.85] tracking-[-0.03em]">
        BLOCK27
      </h1>
      <p className="mb-16 mt-4 max-w-md text-ash">
        You own good clothes. You wear them wrong. Show me three and I&rsquo;ll
        fix one outfit — no account.
      </p>

      <GuestTry />
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { WardrobeGrid } from "@/components/WardrobeGrid";

// The Pieces view: the whole wardrobe, but with accessories broken out into
// their own labeled home so it's unambiguous where they live and where new ones
// go. Same grid machinery as the wardrobe (WardrobeGrid), grouped. Protected —
// the middleware bounces a guest to /login before this renders.
export default async function PiecesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader current="wardrobe" />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Pieces.
      </h1>
      <p className="text-ash max-w-md mb-16">
        Everything you own. Accessories sit apart.
      </p>

      <WardrobeGrid grouped />
    </main>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { MultiGarmentUpload } from "@/components/MultiGarmentUpload";
import { paymentsOpen } from "@/lib/payments";

export default async function UploadGarmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <AppHeader />

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Add several.
      </h1>
      <p className="text-ash max-w-md mb-12">
        Upload a batch. I read each one and slot it into your wardrobe.
      </p>

      <MultiGarmentUpload paymentsOpen={paymentsOpen()} />
    </main>
  );
}

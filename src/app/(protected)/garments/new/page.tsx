import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GarmentCapture } from "@/components/GarmentCapture";

export default async function NewGarmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <GarmentCapture userId={user.id} />;
}

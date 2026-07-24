"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteGarment } from "@/lib/supabase/storage";

// Delete a garment for real — its row and its stored photo. Returns a result
// instead of redirecting so the client can show the reason on failure and drive
// the navigation on success.
export async function deleteGarmentAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again." };

  return deleteGarment(user.id, id);
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Extra room the founder granted one account on top of its plan (migration
// 0031, `grant_extra` in the SQL editor). Pieces are permanent; outfit
// generations and shopping consults count for the current monthly window only.
// The database cap triggers add the same bonus, so the routes, the hard
// backstop in limits.ts and the triggers all agree on one number.
//
// Fails to 0: if the migration isn't applied yet or the call errors, the user
// simply gets their plan's caps — never more.
export type BonusKind = "pieces" | "composition" | "shopping";

export async function capBonus(
  supabase: SupabaseClient,
  userId: string,
  kind: BonusKind,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("cap_bonus", {
      p_user_id: userId,
      p_kind: kind,
    });
    if (error) return 0;
    const n = Number(data);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

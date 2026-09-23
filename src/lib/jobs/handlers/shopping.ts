import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/lib/jobs";
import { recommendGaps } from "@/lib/brain/recommendGaps";
import { searchUrl } from "@/lib/shopping/searchUrl";
import { toLanguage, type Language } from "@/lib/lang";
import type { GarmentAnalysis } from "@/lib/brain/types";

// Run a shopping consultation in the background. The reasoning call happens
// first; the previous recommendations and session are replaced only afterward, so
// the old results stay visible for the length of the call and the swap window is
// just the two writes. Money is recomputed server-side — never trust the model's
// arithmetic. A thrown error requeues the job and refunds the reserved slot.
export async function handleShopping(
  admin: SupabaseClient,
  job: Job,
): Promise<{ result: Record<string, unknown> }> {
  const userId = job.user_id;
  const payload = (job.payload ?? {}) as { budget?: number | null; language?: string };
  const budget = typeof payload.budget === "number" ? payload.budget : null;
  const language: Language = toLanguage(payload.language);

  // Text only — the stored analyses. Photos are never re-read.
  const { data: rows } = await admin
    .from("garments")
    .select("analysis")
    .eq("user_id", userId)
    .eq("status", "analyzed");
  const garments = (rows ?? [])
    .filter((g) => g.analysis)
    .map((g) => ({ analysis: g.analysis as GarmentAnalysis }));

  // The enqueue endpoint guards an empty wardrobe; if we somehow got here with
  // one, advise without touching the stored consultation.
  if (garments.length === 0) {
    return {
      result: {
        count: 0,
        solid: false,
        advice:
          "Nothing to shop for yet. Add the pieces you already own first — I audit a wardrobe, I don't guess into empty space.",
      },
    };
  }

  const plan = await recommendGaps(garments, budget, language);

  // Recompute the money server-side — never trust the model's arithmetic.
  const picks = plan.picks ?? [];
  const spent = picks.reduce(
    (sum, p) => sum + (Number.isFinite(p.spend) && p.spend > 0 ? Math.floor(p.spend) : 0),
    0,
  );
  const remaining = budget != null ? budget - spent : null;

  // Replace the previous consultation — picks and the session frame.
  const [{ error: delRecErr }, { error: delSessErr }] = await Promise.all([
    admin.from("recommendations").delete().eq("user_id", userId),
    admin.from("shopping_sessions").delete().eq("user_id", userId),
  ]);
  if (delRecErr) throw new Error(`store failed: ${delRecErr.message}`);
  if (delSessErr) throw new Error(`store failed: ${delSessErr.message}`);

  if (picks.length > 0) {
    const { error: insErr } = await admin.from("recommendations").insert(
      picks.map((p, i) => {
        const spend =
          Number.isFinite(p.spend) && p.spend > 0 ? Math.floor(p.spend) : null;
        return {
          user_id: userId,
          category: p.category,
          title: p.title,
          look_for: p.look_for,
          why: p.why,
          price_low: p.price_low,
          price_high: p.price_high,
          spend,
          search_query: p.search_query,
          affiliate_url: searchUrl(p.search_query) || null,
          priority: i, // brain already ordered most-unlocking first
        };
      }),
    );
    if (insErr) throw new Error(`store failed: ${insErr.message}`);
  }

  const { error: sessErr } = await admin.from("shopping_sessions").insert({
    user_id: userId,
    budget,
    spent,
    remaining,
    solid: plan.solid,
    advice: plan.advice ?? "",
    gaps: plan.gaps ?? [],
  });
  if (sessErr) throw new Error(`store failed: ${sessErr.message}`);

  return { result: { count: picks.length, solid: plan.solid, advice: plan.advice ?? "" } };
}

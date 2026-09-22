import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/lib/jobs";
import { composeNextOutfit, type PriorOutfit } from "@/lib/brain/composeOutfits";
import type { GarmentAnalysis } from "@/lib/brain/types";
import { acceptOutfit } from "@/lib/jobs/handlers/validate";
import { toLanguage, type Language } from "@/lib/lang";

// Compose outfits in the background, one at a time, into a NEW generation, then
// swap it in. The old generation stays published and visible the whole time; only
// the final swap moves the pointer and drops the old rows, so the set is never
// empty. Each inserted outfit is visible to the user's status poll immediately —
// that's the streaming.

const MAX_OUTFITS = 3;
// Stop starting new outfit calls past this. A call started at the budget can add
// its 15s timeout, so 40s keeps the worst case (~55s) under the 60s function cap.
// Whatever's already produced still swaps in.
const TIME_BUDGET_MS = 40_000;

export async function handleComposition(
  admin: SupabaseClient,
  job: Job,
): Promise<{ result: Record<string, unknown> }> {
  const userId = job.user_id;
  const payload = (job.payload ?? {}) as { occasion?: string; language?: string };
  const occasion = typeof payload.occasion === "string" ? payload.occasion : "";
  const language: Language = toLanguage(payload.language);

  // Published generation → the draft we build is the next one up.
  const { data: u } = await admin
    .from("users")
    .select("outfits_generation")
    .eq("id", userId)
    .maybeSingle();
  const publishedGen = Number(u?.outfits_generation ?? 0);
  const newGen = publishedGen + 1;

  // Clear any stale drafts (a prior aborted run) so this generation starts clean.
  await admin
    .from("outfits")
    .delete()
    .eq("user_id", userId)
    .gt("generation", publishedGen);

  // The wardrobe as text — analyzed garments only. Photos are never re-read.
  const { data: rows } = await admin
    .from("garments")
    .select("id, analysis")
    .eq("user_id", userId)
    .eq("status", "analyzed");
  const garments = (rows ?? [])
    .filter((g) => g.analysis)
    .map((g) => ({ id: g.id as string, analysis: g.analysis as GarmentAnalysis }));

  // The enqueue endpoint guards thin wardrobes; if we somehow got here with one,
  // do nothing rather than swap the existing set to empty.
  if (garments.length < 2) {
    return { result: { count: 0, gap: "", gapPoints: [] } };
  }

  const validIds = new Set(garments.map((g) => g.id));
  const started = Date.now();
  const prior: PriorOutfit[] = [];
  let gapPoints: string[] = [];

  try {
    for (let i = 0; i < MAX_OUTFITS; i++) {
      if (Date.now() - started > TIME_BUDGET_MS) break;
      const step = await composeNextOutfit(garments, occasion, language, prior);
      gapPoints = step.gap_points;
      if (step.done || !step.outfit) break;

      // Per-outfit validation: real ids, at least two, no repeat set or angle.
      const uniqueIds = acceptOutfit(step.outfit, validIds, prior);
      if (!uniqueIds) break;

      // Stream it: insert into the new generation now, so the poll sees it.
      const { error: insErr } = await admin.from("outfits").insert({
        user_id: userId,
        item_ids: uniqueIds,
        reasoning: step.outfit.reasoning,
        generation: newGen,
      });
      if (insErr) throw new Error(`store failed: ${insErr.message}`);
      prior.push({ item_ids: uniqueIds, angle: step.outfit.angle });
    }
  } catch (e) {
    // Roll back this run's draft so a retry (or the next run) starts clean.
    await admin.from("outfits").delete().eq("user_id", userId).eq("generation", newGen);
    throw e;
  }

  // Swap: publish the new generation, drop the old, atomically. Never empty.
  const { error: swapErr } = await admin.rpc("swap_outfit_generation", {
    p_user_id: userId,
    p_new_gen: newGen,
  });
  if (swapErr) {
    await admin.from("outfits").delete().eq("user_id", userId).eq("generation", newGen);
    throw new Error(`swap failed: ${swapErr.message}`);
  }

  // Persist the gap for the outfits/settings view, same as the sync path did.
  const points =
    prior.length === 0 && gapPoints.length === 0
      ? ["Nothing here holds together yet. Add pieces that pair."]
      : gapPoints;
  const gap = points.join(" ");
  await admin
    .from("users")
    .update({
      latest_gap: gap,
      latest_gap_points: points,
      latest_gap_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { result: { count: prior.length, gap, gapPoints: points } };
}

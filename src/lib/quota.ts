import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";

// Fair-use limits. The render caps match the render route (3/day, 30/month);
// they are env-overridable and clamped to a positive integer. The piece cap is
// plan-aware and lives in @/lib/plan (free = 15).
function limitFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const DAILY_RENDER_LIMIT = limitFromEnv("RENDER_DAILY_LIMIT", 3);
export const MONTHLY_RENDER_LIMIT = limitFromEnv("RENDER_MONTHLY_LIMIT", 30);

export type Quota = {
  rendersToday: number;
  rendersMonth: number;
  dailyRenderLimit: number;
  monthlyRenderLimit: number;
  pieces: number;
  pieceLimit: number;
};

// Read-only usage for the settings screen. RLS scopes every count to the user.
export async function getQuota(userId: string): Promise<Quota> {
  const supabase = await createClient();
  const plan = await getPlan(userId);

  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();

  const [dayRes, monthRes, pieceRes] = await Promise.all([
    supabase
      .from("renders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStart),
    supabase
      .from("renders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart),
    supabase
      .from("garments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return {
    rendersToday: dayRes.count ?? 0,
    rendersMonth: monthRes.count ?? 0,
    dailyRenderLimit: DAILY_RENDER_LIMIT,
    monthlyRenderLimit: MONTHLY_RENDER_LIMIT,
    pieces: pieceRes.count ?? 0,
    pieceLimit: plan.pieceLimit,
  };
}

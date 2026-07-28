import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Audit the DECISION, never the image. pass/reject + reason + user id +
// timestamp. Written with the service-role client into moderation_log, a table
// with no user-facing access (no policies) — there is no surface, human or API,
// that reads a user's photo out of this. Best-effort: a logging failure must
// never affect the gate, so it falls back to the server log.
export async function logModeration(input: {
  userId: string;
  kind: "base" | "garment";
  decision: "pass" | "reject";
  reason?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("moderation_log").insert({
      user_id: input.userId,
      kind: input.kind,
      decision: input.decision,
      reason: input.reason ?? null,
    });
    if (error) throw error;
  } catch (e) {
    console.warn(
      "[moderation] audit fallback",
      new Date().toISOString(),
      input.kind,
      input.decision,
      input.userId,
      input.reason ?? "",
      e instanceof Error ? e.message : "",
    );
  }
}

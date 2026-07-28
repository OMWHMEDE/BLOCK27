import "server-only";
import { getModerator } from "@/lib/moderation";
import type { ModerationMedia } from "@/lib/moderation/types";

const MEDIA: Record<string, ModerationMedia> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export type GateResult =
  | { status: "ok"; bytes: Buffer; mediaType: ModerationMedia }
  | { status: "reject"; reason: string }
  | { status: "retry"; reason: string };

// Reads the uploaded file and moderates it entirely in memory. Nothing is
// written anywhere here. On a provider error it returns "retry" — fail closed,
// the caller must NOT store the image, and the user is asked to try again rather
// than accused of anything.
export async function gate(file: unknown): Promise<GateResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { status: "retry", reason: "No photo received. Try again." };
  }

  const mediaType = MEDIA[file.type] ?? "image/jpeg";
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const result = await getModerator().check({
      base64: bytes.toString("base64"),
      mediaType,
    });
    if (!result.allowed) return { status: "reject", reason: result.reason };
    return { status: "ok", bytes, mediaType };
  } catch (e) {
    console.error(
      "[moderation] provider error — failing closed",
      e instanceof Error ? e.message : "",
    );
    return { status: "retry", reason: "Couldn't process that. Try again." };
  }
}

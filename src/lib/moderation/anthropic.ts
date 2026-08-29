import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Moderator,
  ModerationResult,
  ModerationMedia,
  ModerationKind,
} from "./types";

// The default moderator — the vision provider the app already uses (Anthropic).
// No new third-party vendor. Reads ANTHROPIC_API_KEY at call time, backend only.
const MODEL = process.env.MODERATION_MODEL ?? "claude-haiku-4-5";

const SAFETY = `You are the content-safety gate for BLOCK27, a menswear styling app. A user has uploaded either a full-body photo of themselves (their base photo) or a photo of a single garment, and it is about to be stored.

Your first job: block explicit nudity and sexual content before it is stored.

ALLOW (allowed = true):
- Ordinary clothed people, in any clothing, including visible skin: t-shirt and shorts, short sleeves, a tank top, athletic wear, swimwear, or a bare chest. Everyday photos are fine.
- Any photo of a garment or accessory on its own.

REJECT (allowed = false) only for:
- Exposed genitals, anus, or buttocks; exposed female breasts or nipples.
- Sexual acts, or clearly sexual or pornographic posing.
- Any sexual content involving someone who appears to be a minor.

Be conservative about genuinely explicit content, but do NOT reject a normal clothed photo — a false rejection breaks onboarding. When unsure between "ordinary photo with visible skin" and "explicit", treat it as ordinary and ALLOW.

When you reject, write reason as one short, cold, non-shaming instruction the user can act on — for example "This can't be used. Upload a photo in clothing." Never insult the body. Never moralise. No exclamation marks, no emoji. When you allow, reason is an empty string.`;

// Appended for a base photo only. A framing problem never blocks storage — it is
// advisory. warning stays empty unless the shot is not a full body.
const BASE_FRAMING = `

Second, a NON-BLOCKING framing check on this base photo — it never changes your allow/reject decision. Every outfit is rendered onto this photo, so the whole body must be in frame, especially the legs and feet. If the legs or feet are cut off (a waist-up or knee-up shot), set warning to one calm, cold instruction, e.g. "Legs aren't in frame. Trousers and shoes can't render right. Retake full-body." If the full body from head to feet is in frame, set warning to an empty string. Judge only framing here, nothing else.

Record your decision with the moderate_image tool.`;

// Appended for a garment photo: there is no body to frame, so never warn.
const GARMENT_NOTE = `

This is a garment photo, not a person — there is no framing check. Always set warning to an empty string.

Record your decision with the moderate_image tool.`;

function systemFor(kind: ModerationKind): string {
  return SAFETY + (kind === "base" ? BASE_FRAMING : GARMENT_NOTE);
}

const TOOL = {
  name: "moderate_image",
  description: "Record the storage-gate decision for one image.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      allowed: { type: "boolean" },
      reason: {
        type: "string",
        description:
          "Empty string when allowed; a short, cold, non-shaming instruction when rejected.",
      },
      warning: {
        type: "string",
        description:
          "NON-blocking framing advisory (base photos only). Empty unless the " +
          "body is not fully in frame; never affects the allow/reject decision.",
      },
    },
    required: ["allowed", "reason", "warning"],
  },
} as unknown as Anthropic.Tool;

export class AnthropicModerator implements Moderator {
  async check({
    base64,
    mediaType,
    kind,
  }: {
    base64: string;
    mediaType: ModerationMedia;
    kind: ModerationKind;
  }): Promise<ModerationResult> {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: systemFor(kind),
      thinking: { type: "disabled" },
      tools: [TOOL],
      tool_choice: { type: "tool", name: "moderate_image" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: "Classify this image for the storage gate." },
          ],
        },
      ],
    });

    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      throw new Error("moderation returned no decision");
    }
    const out = block.input as {
      allowed?: boolean;
      reason?: string;
      warning?: string;
    };

    if (out.allowed === true) {
      // Framing is advisory only, and only bases produce one. A blank/whitespace
      // warning collapses to no warning.
      const warning = kind === "base" ? out.warning?.trim() : "";
      return warning ? { allowed: true, warning } : { allowed: true };
    }
    return {
      allowed: false,
      reason:
        out.reason?.trim() || "This can't be used. Upload a photo in clothing.",
    };
  }
}

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Moderator, ModerationResult, ModerationMedia } from "./types";

// The default moderator — the vision provider the app already uses (Anthropic).
// No new third-party vendor. Reads ANTHROPIC_API_KEY at call time, backend only.
const MODEL = process.env.MODERATION_MODEL ?? "claude-haiku-4-5";

const SYSTEM = `You are the content-safety gate for BLOCK27, a menswear styling app. A user has uploaded either a full-body photo of themselves (their base photo) or a photo of a single garment, and it is about to be stored.

Your only job: block explicit nudity and sexual content before it is stored. Nothing else.

ALLOW (allowed = true):
- Ordinary clothed people, in any clothing, including visible skin: t-shirt and shorts, short sleeves, a tank top, athletic wear, swimwear, or a bare chest. Everyday photos are fine.
- Any photo of a garment or accessory on its own.

REJECT (allowed = false) only for:
- Exposed genitals, anus, or buttocks; exposed female breasts or nipples.
- Sexual acts, or clearly sexual or pornographic posing.
- Any sexual content involving someone who appears to be a minor.

Be conservative about genuinely explicit content, but do NOT reject a normal clothed photo — a false rejection breaks onboarding. When unsure between "ordinary photo with visible skin" and "explicit", treat it as ordinary and ALLOW.

When you reject, write reason as one short, cold, non-shaming instruction the user can act on — for example "This can't be used. Upload a photo in clothing." Never insult the body. Never moralise. No exclamation marks, no emoji. When you allow, reason is an empty string.

Record your decision with the moderate_image tool.`;

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
    },
    required: ["allowed", "reason"],
  },
} as unknown as Anthropic.Tool;

export class AnthropicModerator implements Moderator {
  async check({
    base64,
    mediaType,
  }: {
    base64: string;
    mediaType: ModerationMedia;
  }): Promise<ModerationResult> {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM,
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
    const out = block.input as { allowed?: boolean; reason?: string };

    if (out.allowed === true) return { allowed: true };
    return {
      allowed: false,
      reason:
        out.reason?.trim() || "This can't be used. Upload a photo in clothing.",
    };
  }
}

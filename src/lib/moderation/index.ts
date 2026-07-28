import "server-only";
import type { Moderator } from "./types";
import { AnthropicModerator } from "./anthropic";

export type { Moderator, ModerationResult, ModerationMedia } from "./types";

// Swappable like the render hand. MODERATION_PROVIDER selects the provider;
// default is the existing vision provider (Anthropic). An unknown value falls
// BACK to the default rather than leaving the gate open — the gate must never be
// silently disabled.
export function getModerator(): Moderator {
  const provider = process.env.MODERATION_PROVIDER ?? "anthropic";
  switch (provider) {
    case "anthropic":
      return new AnthropicModerator();
    default:
      return new AnthropicModerator();
  }
}

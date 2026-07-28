// The moderation gate — checks image bytes in memory, before anything is written
// to permanent storage. It NEVER stores. It throws on a provider error so the
// caller can fail closed (never store unchecked content).

export type ModerationMedia = "image/jpeg" | "image/png" | "image/webp";

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export interface Moderator {
  check(input: {
    base64: string;
    mediaType: ModerationMedia;
  }): Promise<ModerationResult>;
}

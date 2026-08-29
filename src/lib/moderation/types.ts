// The moderation gate — checks image bytes in memory, before anything is written
// to permanent storage. It NEVER stores. It throws on a provider error so the
// caller can fail closed (never store unchecked content).

export type ModerationMedia = "image/jpeg" | "image/png" | "image/webp";

// Which upload this is. Moderation is identical for both, but a base photo also
// gets a non-blocking framing check (is the whole body in frame) that a garment
// photo doesn't. The kind selects those extra, advisory-only checks.
export type ModerationKind = "base" | "garment";

export type ModerationResult =
  // `warning` is a calm, NON-blocking advisory (empty/absent when the photo is
  // fine). It never gates storage — allowed stays true — it's surfaced to the
  // user so they can choose to reshoot. Only bases carry one today.
  | { allowed: true; warning?: string }
  | { allowed: false; reason: string };

export interface Moderator {
  check(input: {
    base64: string;
    mediaType: ModerationMedia;
    kind: ModerationKind;
  }): Promise<ModerationResult>;
}

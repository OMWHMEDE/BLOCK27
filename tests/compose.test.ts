import { describe, it, expect } from "vitest";
import { capReasoning } from "@/lib/brain/composeOutfits";

// The reasoning cap is only a runaway backstop now (one or two sentences is the
// intent); it trims cleanly, no ellipsis. Keep in sync with MAX_REASONING_CHARS.
const LIMIT = 320;

describe("capReasoning", () => {
  it("leaves a one-or-two-sentence reason untouched (trimmed)", () => {
    const s =
      "The bomber's the hero. Everything under it stays flat so it reads as a decision, not an accident.";
    expect(s.length).toBeLessThanOrEqual(LIMIT);
    expect(capReasoning("  " + s + "  ")).toBe(s);
  });

  it("cuts a runaway at a sentence boundary when there is one", () => {
    const first = "The bomber carries it and the rest goes quiet.";
    // A long tail with no sentence-ending punctuation, pushing well past LIMIT.
    const tail = "quiet neutral layers ".repeat(30);
    const out = capReasoning(first + " " + tail);
    expect(out).toBe(first);
    expect(out.length).toBeLessThanOrEqual(LIMIT);
  });

  it("cuts at a word boundary when there is no sentence end", () => {
    const s = "charcoal ".repeat(60); // ~540 chars, no sentence punctuation
    const out = capReasoning(s);
    expect(out.length).toBeLessThanOrEqual(LIMIT);
    expect(out.length).toBeGreaterThan(LIMIT - 20); // used most of the budget
    expect(out.endsWith(" ")).toBe(false);
    expect(s.startsWith(out)).toBe(true); // whole words only, a real prefix
    expect(out).not.toMatch(/…$/);
  });

  it("handles empty/whitespace input", () => {
    expect(capReasoning("")).toBe("");
    expect(capReasoning("   ")).toBe("");
  });
});

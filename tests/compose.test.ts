import { describe, it, expect } from "vitest";
import { capReasoning } from "@/lib/brain/composeOutfits";

// The reasoning cap is the backstop that keeps a stored/shown reason short even
// if the model overruns its one-sentence instruction. 160 chars, clean cut, no
// ellipsis.
const LIMIT = 160;

describe("capReasoning", () => {
  it("leaves a short reason untouched (trimmed)", () => {
    const s = "The bomber's the hero; everything under it stays flat.";
    expect(capReasoning("  " + s + "  ")).toBe(s);
  });

  it("cuts a long reason at a sentence boundary when there is one", () => {
    const first = "The bomber carries it and the rest goes quiet.";
    const s = first + " " + "A second sentence that pushes well past the one-hundred-and-sixty character limit so the cap has to drop it entirely from the output.";
    const out = capReasoning(s);
    expect(out).toBe(first);
    expect(out.length).toBeLessThanOrEqual(LIMIT);
  });

  it("cuts at a word boundary when there is no sentence end", () => {
    const s = "charcoal overshirt over the tee with wide black trousers and the chunky boots anchoring a heavy monochrome column that just keeps going and going and going past the limit";
    const out = capReasoning(s);
    expect(out.length).toBeLessThanOrEqual(LIMIT);
    expect(out.endsWith(" ")).toBe(false);
    // No mid-word cut: the truncated text is a prefix ending on a whole word.
    expect(s.startsWith(out)).toBe(true);
    expect(out).not.toMatch(/…$/);
  });

  it("handles empty/whitespace input", () => {
    expect(capReasoning("")).toBe("");
    expect(capReasoning("   ")).toBe("");
  });
});

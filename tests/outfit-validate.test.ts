import { describe, it, expect } from "vitest";
import { acceptOutfit, sameSet } from "@/lib/jobs/handlers/validate";

const valid = new Set(["a", "b", "c", "d"]);

describe("acceptOutfit", () => {
  it("accepts a valid outfit and returns de-duplicated real ids", () => {
    const out = acceptOutfit({ item_ids: ["a", "b", "a"], angle: "tonal" }, valid, []);
    expect(out).toEqual(["a", "b"]);
  });

  it("drops ids that aren't in the wardrobe", () => {
    const out = acceptOutfit({ item_ids: ["a", "zzz", "c"], angle: "x" }, valid, []);
    expect(out).toEqual(["a", "c"]);
  });

  it("rejects fewer than two real pieces", () => {
    expect(acceptOutfit({ item_ids: ["a", "ghost"], angle: "x" }, valid, [])).toBeNull();
    expect(acceptOutfit({ item_ids: ["a", "a"], angle: "x" }, valid, [])).toBeNull();
  });

  it("rejects a repeat of a prior angle (case/space-insensitive)", () => {
    const prior = [{ item_ids: ["c", "d"], angle: "One Red Accent" }];
    expect(
      acceptOutfit({ item_ids: ["a", "b"], angle: "  one red accent " }, valid, prior),
    ).toBeNull();
  });

  it("rejects a repeat of a prior item set regardless of order", () => {
    const prior = [{ item_ids: ["a", "b"], angle: "tonal" }];
    expect(
      acceptOutfit({ item_ids: ["b", "a"], angle: "different angle" }, valid, prior),
    ).toBeNull();
  });

  it("allows a distinct outfit alongside prior ones", () => {
    const prior = [{ item_ids: ["a", "b"], angle: "tonal" }];
    expect(
      acceptOutfit({ item_ids: ["c", "d"], angle: "one accent" }, valid, prior),
    ).toEqual(["c", "d"]);
  });

  it("does not treat empty angles as duplicates of each other", () => {
    const prior = [{ item_ids: ["a", "b"], angle: "" }];
    expect(acceptOutfit({ item_ids: ["c", "d"], angle: "" }, valid, prior)).toEqual([
      "c",
      "d",
    ]);
  });
});

describe("sameSet", () => {
  it("is order-independent and length-sensitive", () => {
    expect(sameSet(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameSet(["a", "b"], ["a", "b", "c"])).toBe(false);
    expect(sameSet(["a"], ["b"])).toBe(false);
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { getHand } from "@/lib/hand";
import type { ImageRef } from "@/lib/hand";

const person: ImageRef = { bucket: "user-photos", path: "u/person.jpg" };
const garment: ImageRef = { bucket: "user-photos", path: "u/garment.jpg" };

describe("the hand", () => {
  const original = process.env.HAND_PROVIDER;
  afterEach(() => {
    process.env.HAND_PROVIDER = original;
  });

  it("defaults to the stub, which renders nothing and says so", async () => {
    delete process.env.HAND_PROVIDER;
    const result = await getHand().render({
      person,
      garment,
      category: "tops",
      quality: "max",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("provider_error");
      expect(result.detail).toBe("no provider configured");
    }
  });

  it("falls back to the stub for an unknown provider rather than guessing", async () => {
    process.env.HAND_PROVIDER = "not-a-real-provider";
    const result = await getHand().render({
      person,
      garment,
      category: "bottoms",
      quality: "max",
    });
    expect(result.ok).toBe(false);
  });
});

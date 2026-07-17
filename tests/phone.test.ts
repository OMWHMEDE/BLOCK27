import { describe, it, expect, afterEach, vi } from "vitest";
import { StubVerifier } from "@/lib/phone/stub";

describe("StubVerifier", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it("accepts the dev code 000000 and rejects anything else", async () => {
    const v = new StubVerifier();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const sent = await v.send("+15555550123");
    expect(sent.ok).toBe(true);
    expect(log).toHaveBeenCalled();
    expect(await v.check("+15555550123", "000000")).toBe(true);
    expect(await v.check("+15555550123", "123456")).toBe(false);
  });

  it("throws loudly if constructed in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV =
      "production";
    expect(() => new StubVerifier()).toThrow(/production/);
  });
});

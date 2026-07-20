import { describe, it, expect, afterEach, vi } from "vitest";
import { StubVerifier } from "@/lib/phone/stub";

function setNodeEnv(value: string) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("StubVerifier", () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    setNodeEnv(originalEnv ?? "test");
    vi.restoreAllMocks();
  });

  it("never throws at construction, even in production", () => {
    setNodeEnv("production");
    expect(() => new StubVerifier()).not.toThrow();
  });

  it("in development, accepts 000000 and rejects anything else", async () => {
    setNodeEnv("development");
    const v = new StubVerifier();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const sent = await v.send("+15555550123");
    expect(sent.ok).toBe(true);
    expect(log).toHaveBeenCalled();
    expect(await v.check("+15555550123", "000000")).toBe(true);
    expect(await v.check("+15555550123", "123456")).toBe(false);
  });

  it("in production, refuses at the call site and never verifies", async () => {
    setNodeEnv("production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const v = new StubVerifier();

    const sent = await v.send("+15555550123");
    expect(sent.ok).toBe(false);

    // The stub must never verify a real phone in production — not even 000000.
    expect(await v.check("+15555550123", "000000")).toBe(false);
    expect(err).toHaveBeenCalled();
  });
});

import { describe, it, expect } from "vitest";
import { decideRenderStep } from "@/lib/jobs/handlers/render";

const MAX = 3; // one try + two retries

describe("decideRenderStep", () => {
  it("advances after a non-final layer succeeds", () => {
    expect(decideRenderStep({ ok: true }, 0, 3, 0, MAX)).toEqual({ kind: "advance" });
    expect(decideRenderStep({ ok: true }, 1, 3, 2, MAX)).toEqual({ kind: "advance" });
  });

  it("finishes when the last layer succeeds", () => {
    expect(decideRenderStep({ ok: true }, 2, 3, 0, MAX)).toEqual({ kind: "finish" });
    expect(decideRenderStep({ ok: true }, 0, 1, 0, MAX)).toEqual({ kind: "finish" });
  });

  it("retries a transient failure while attempts remain", () => {
    expect(
      decideRenderStep({ ok: false, transient: true, detail: "timeout" }, 1, 3, 0, MAX),
    ).toEqual({ kind: "retry" });
    expect(
      decideRenderStep({ ok: false, transient: true, detail: "timeout" }, 1, 3, 1, MAX),
    ).toEqual({ kind: "retry" });
  });

  it("fails a transient failure once attempts are exhausted", () => {
    expect(
      decideRenderStep({ ok: false, transient: true, detail: "timeout" }, 1, 3, 2, MAX),
    ).toEqual({ kind: "fail", detail: "timeout" });
  });

  it("fails a non-transient failure immediately, even on attempt 0", () => {
    expect(
      decideRenderStep({ ok: false, transient: false, detail: "rejected input" }, 0, 3, 0, MAX),
    ).toEqual({ kind: "fail", detail: "rejected input" });
  });
});

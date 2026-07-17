import type { Hand, RenderResult } from "@/lib/hand/types";

// The default hand until a provider is wired in Phase 0.5. It renders nothing
// and says so. Product code can depend on the interface today without any paid
// provider existing.
export class StubHand implements Hand {
  async render(): Promise<RenderResult> {
    return {
      ok: false,
      reason: "provider_error",
      detail: "no provider configured",
    };
  }
}

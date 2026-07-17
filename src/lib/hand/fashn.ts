import type { Hand, RenderResult } from "@/lib/hand/types";

// TODO: Phase 0.5 — wire the FASHN provider.
//
// Class signature only. The API call is deliberately unwritten: do not guess
// the request shape. When Phase 0.5 arrives, implement render() here and select
// this provider with HAND_PROVIDER=fashn. Nothing else in the codebase changes.
export class FashnHand implements Hand {
  render(): Promise<RenderResult> {
    throw new Error("FashnHand not implemented (Phase 0.5)");
  }
}

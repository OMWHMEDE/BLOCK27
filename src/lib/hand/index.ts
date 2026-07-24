import type { Hand } from "@/lib/hand/types";
import { StubHand } from "@/lib/hand/stub";
import { FashnHand } from "@/lib/hand/fashn";

export type {
  Hand,
  ImageRef,
  RenderResult,
  RenderCategory,
  Quality,
} from "@/lib/hand/types";

// The single seam where a provider is chosen. Product code calls getHand() and
// never learns which provider answered. Swapping providers is one env var.
export function getHand(): Hand {
  const provider = process.env.HAND_PROVIDER ?? "stub";

  switch (provider) {
    case "fashn":
      return new FashnHand();
    case "stub":
      return new StubHand();
    default:
      // Unknown provider: fail safe to the stub rather than guess.
      return new StubHand();
  }
}

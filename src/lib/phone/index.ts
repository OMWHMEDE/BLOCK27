import "server-only";
import type { PhoneVerifier } from "@/lib/phone/types";
import { StubVerifier } from "@/lib/phone/stub";

export type { PhoneVerifier } from "@/lib/phone/types";

// The single seam where the verifier is chosen. Wiring a real SMS provider
// later means adding a case here and a file next to stub.ts — nothing else.
export function getPhoneVerifier(): PhoneVerifier {
  const impl = process.env.PHONE_VERIFIER ?? "stub";

  switch (impl) {
    case "stub":
      return new StubVerifier();
    default:
      throw new Error(`Unknown PHONE_VERIFIER: ${impl}`);
  }
}

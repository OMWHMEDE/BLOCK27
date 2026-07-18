import "server-only";
import type { PhoneVerifier } from "@/lib/phone/types";

// Dev-only verifier. Logs the "sent" code to the server console and accepts the
// fixed code 000000 — in development.
//
// In production it REFUSES, at the call site. Constructing it is always safe:
// throwing at construction (or import) can take down anything that touches the
// module graph, so the guard lives in send()/check() instead. The refusal is
// fail-closed — send() reports failure and check() never returns true — so a
// misconfigured production deploy can never verify a real phone with the stub.
const DEV_CODE = "000000";

function blockedInProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export class StubVerifier implements PhoneVerifier {
  async send(
    phone: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (blockedInProduction()) {
      console.error(
        "[StubVerifier] refusing to send in production. Configure a real PHONE_VERIFIER.",
      );
      return { ok: false, reason: "Phone verification is not configured." };
    }
    // No SMS is sent. The code is fixed and printed for local testing.
    console.log(`[StubVerifier] verification code for ${phone}: ${DEV_CODE}`);
    return { ok: true };
  }

  async check(_phone: string, code: string): Promise<boolean> {
    if (blockedInProduction()) {
      console.error(
        "[StubVerifier] refusing to verify in production. Configure a real PHONE_VERIFIER.",
      );
      return false;
    }
    return code === DEV_CODE;
  }
}

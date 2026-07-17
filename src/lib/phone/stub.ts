import "server-only";
import type { PhoneVerifier } from "@/lib/phone/types";

// Dev-only verifier. Logs the "sent" code to the server console and accepts the
// fixed code 000000. It throws loudly if it is ever constructed in production —
// shipping a verifier that accepts 000000 would make phone verification a lie.
const DEV_CODE = "000000";

export class StubVerifier implements PhoneVerifier {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "StubVerifier must never run in production. Configure a real PHONE_VERIFIER.",
      );
    }
  }

  async send(
    phone: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    // No SMS is sent. The code is fixed and printed for local testing.
    console.log(`[StubVerifier] verification code for ${phone}: ${DEV_CODE}`);
    return { ok: true };
  }

  async check(_phone: string, code: string): Promise<boolean> {
    return code === DEV_CODE;
  }
}

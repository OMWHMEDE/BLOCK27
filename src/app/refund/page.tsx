import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Refund Policy",
};

export default function RefundPage() {
  return (
    <LegalShell
      title="Refunds."
      intro="What we refund, and how. Short version: the stylist is free to try, and paid subscriptions are billed and refunded by Apple."
      current="/refund"
    >
      <Clause label="Free first">
        <p>
          Reading your wardrobe, composing outfits, the gap analysis, and the
          shopping plan are all available on the free tier up to its monthly
          limits. You can use BLOCK27 before you ever pay, so there is nothing to
          refund on the free tier.
        </p>
      </Clause>

      <Clause label="Paid subscriptions are billed by Apple">
        <p>
          The paid plan (BLOCK27 — $9.99/month or $79.99/year) is sold inside the
          iOS app through Apple in-app purchase. Apple is the merchant of record:
          the charge is on your Apple account, and Apple handles refunds under its
          own policy.
        </p>
      </Clause>

      <Clause label="How to request a refund">
        <p>
          Refunds for an in-app purchase are requested from Apple, not from us, at{" "}
          <a
            href="https://reportaproblem.apple.com"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            reportaproblem.apple.com
          </a>{" "}
          (or App Store → your name → Purchase History). We cannot directly refund
          an Apple purchase. If you are not sure how, email {SUPPORT_EMAIL} and we
          will point you to the right place.
        </p>
      </Clause>

      <Clause label="Cancelling">
        <p>
          Cancel any time in your Apple account settings (App Store → your name →
          Subscriptions, or iOS Settings → your name → Subscriptions). Cancelling
          stops future renewals; your access continues until the end of the period
          you have already paid for. Cancelling on its own does not refund the
          current period — request that from Apple, above.
        </p>
      </Clause>

      <Clause label="Your statutory rights">
        <p>
          Nothing in this policy removes any refund or cancellation rights you
          have under the consumer law that applies to you. Where the law requires
          a refund, you keep that right regardless of anything above.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Billing questions: {SUPPORT_EMAIL}.</p>
      </Clause>
    </LegalShell>
  );
}

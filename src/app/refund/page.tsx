import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Refund Policy",
};

export default function RefundPage() {
  return (
    <LegalShell
      title="Refunds."
      intro="What we refund, and when. Short version: the stylist is free to try, and there's a 3-day window on a paid charge if you haven't spent a try-on."
      current="/refund"
    >
      <Clause label="Free first">
        <p>
          Reading your wardrobe, composing outfits, and the shopping audit are
          free. The paid feature is the try-on — rendering an outfit onto your own
          photo. You can use the free stylist before you ever pay, so there is
          nothing to refund on the free tier.
        </p>
      </Clause>

      <Clause label="3-day refund window">
        <p>
          If you subscribe to a paid plan (Premium, Pro, or Boss) and change your
          mind, you can request a full refund within 3 days of a charge —
          provided you have not used any try-ons during that window. Each try-on
          is a real, non-recoverable cost on our side, so once you have rendered
          an outfit on the paid plan, that charge is non-refundable.
        </p>
        <p>After 3 days, subscription charges are non-refundable.</p>
      </Clause>

      <Clause label="Cancelling">
        <p>
          You can cancel your subscription at any time from your account.
          Cancelling stops future renewals; your access continues until the end
          of the period you have already paid for. Cancelling on its own does not
          refund the current period — use the 3-day window above if it applies.
        </p>
      </Clause>

      <Clause label="How to request a refund">
        <p>
          Email {SUPPORT_EMAIL} from the address on your account and tell us which
          charge you mean. Eligible refunds are issued through Whop, our payment
          processor and merchant of record, back to your original payment method.
        </p>
      </Clause>

      <Clause label="Your statutory rights">
        <p>
          Nothing in this policy removes any refund or cancellation rights you
          have under the consumer law that applies to you. Where the law requires
          a refund, Whop, as merchant of record, will honour it regardless of the
          window above.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Billing questions: {SUPPORT_EMAIL}.</p>
      </Clause>
    </LegalShell>
  );
}

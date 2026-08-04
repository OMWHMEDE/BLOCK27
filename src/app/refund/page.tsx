import { LegalShell, Clause } from "@/components/LegalShell";

// PLACEHOLDER legal copy — accurate to how the product works, but pending a real
// lawyer's review before full public launch. See LegalShell for the shared note.
export const metadata = {
  title: "BLOCK27 — Refund Policy",
};

export default function RefundPage() {
  return (
    <LegalShell
      title="Refunds."
      intro="What we refund, and when. Short version: try it free first, and there's a 14-day window if you haven't spent renders."
      current="/refund"
    >
      <Clause label="Free first">
        <p>
          Every account gets 3 renders free, with no payment required. That is
          there so you can see BLOCK27 work on your own body before you decide to
          pay. There is nothing to refund on the free tier.
        </p>
      </Clause>

      <Clause label="14-day refund window">
        <p>
          If you subscribe and change your mind, you can request a full refund
          within 14 days of a charge — provided you have not generated any paid
          renders during that period. Each render is a real, non-recoverable cost
          on our side, so once you have used the paid service to render outfits,
          that charge is non-refundable.
        </p>
        <p>
          After 14 days, subscription charges are non-refundable.
        </p>
      </Clause>

      <Clause label="Cancelling">
        <p>
          You can cancel your subscription at any time from your account.
          Cancelling stops future renewals; your access continues until the end
          of the period you have already paid for. Cancelling on its own does not
          trigger a refund of the current period — use the 14-day window above if
          it applies.
        </p>
      </Clause>

      <Clause label="How to request a refund">
        <p>
          Email support@block27.app from the address on your account and tell us
          which charge you mean. Eligible refunds are issued through Paddle, our
          payment processor and merchant of record, back to your original payment
          method.
        </p>
      </Clause>

      <Clause label="Your statutory rights">
        <p>
          Nothing in this policy removes any refund or cancellation rights you
          have under the consumer law that applies to you. Where the law requires
          a refund, Paddle, as merchant of record, will honour it regardless of
          the window above.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Billing questions: support@block27.app.</p>
      </Clause>
    </LegalShell>
  );
}

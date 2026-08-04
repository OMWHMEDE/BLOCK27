import { LegalShell, Clause } from "@/components/LegalShell";

// PLACEHOLDER legal copy — accurate to how the product works, but pending a real
// lawyer's review before full public launch. See LegalShell for the shared note.
export const metadata = {
  title: "BLOCK27 — Terms",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms."
      intro="Plain terms for using BLOCK27. Create an account or use the product and you accept them."
      current="/terms"
    >
      <Clause label="What this is">
        <p>
          BLOCK27 is an AI menswear styling tool. It reads the clothes you own,
          composes outfits, and renders them onto a photo of you. The service is
          provided on an &ldquo;as is&rdquo; basis; styling is opinion and renders
          are AI-generated approximations, not photographs of real events.
        </p>
      </Clause>

      <Clause label="Eligibility and accounts">
        <p>
          You must be at least 18 years old to use BLOCK27, because it involves
          full-body photography. You are responsible for your account, for the
          accuracy of the information you give us, and for keeping your login
          secure.
        </p>
      </Clause>

      <Clause label="Subscriptions and billing">
        <p>
          A free account includes 3 renders, once — a lifetime allowance, not a
          monthly reset. Paid access is a subscription of $24.99 per month with a
          fair-use allowance of roughly 25 outfits per month, billed through our
          payment processor, Paddle, which acts as merchant of record.
        </p>
        <p>
          The subscription renews automatically each period until you cancel. You
          can cancel at any time; access continues until the end of the period
          you have already paid for. Refunds are governed by our{" "}
          <a
            href="/refund"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Refund Policy
          </a>
          .
        </p>
      </Clause>

      <Clause label="Usage limits">
        <p>
          Each plan has limits — the free render allowance and the paid fair-use
          allowance above. A render that fails is never counted against your
          allowance and you are never charged for it. We may adjust limits to keep
          the service sustainable, with notice of material changes.
        </p>
      </Clause>

      <Clause label="Acceptable use">
        <p>
          Upload only photographs of yourself and clothing you own. You must not
          upload images of other people without their consent, images of minors,
          or any illegal, non-consensual, nude, or otherwise harmful content.
          Submissions are screened; images that fail moderation are rejected and
          not stored, and repeated attempts will end the account.
        </p>
        <p>
          Do not misuse the service: no reselling or redistributing it, no
          scraping, no reverse engineering, and no attempts to break its limits,
          security, or moderation.
        </p>
      </Clause>

      <Clause label="Your content">
        <p>
          Your photos remain yours. You grant us a limited licence to process
          them — including through the third-party processors described in our{" "}
          <a
            href="/privacy"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Privacy Policy
          </a>{" "}
          — solely to provide the service to you. We claim no other rights over
          them.
        </p>
      </Clause>

      <Clause label="Termination">
        <p>
          You can stop at any time and delete your account from Settings, which
          erases your data. We may suspend or terminate an account that breaks
          these terms, in particular the acceptable-use rules.
        </p>
      </Clause>

      <Clause label="Disclaimers and liability">
        <p>
          The service is provided without warranties of any kind, to the extent
          permitted by law. We are not liable for indirect or consequential
          losses, and our total liability is limited to the amount you paid us in
          the three months before the claim. Nothing here removes rights you have
          as a consumer that cannot legally be waived.
        </p>
      </Clause>

      <Clause label="Changes">
        <p>
          We may update these terms as the product grows. Material changes will
          be made plain, not buried, and the &ldquo;last updated&rdquo; date above
          will change.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>support@block27.app.</p>
      </Clause>
    </LegalShell>
  );
}

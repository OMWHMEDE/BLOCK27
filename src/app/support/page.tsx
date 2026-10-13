import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Support",
};

// Public support page — the Support URL for App Store Connect / Google Play. One
// contact method and answers to the few things people actually ask. On the
// shopfront allowlist so it resolves while the site is a landing page. Brand
// frame via LegalShell.
export default function SupportPage() {
  return (
    <LegalShell
      title="Support."
      intro="A question, a bug, or something that won't work — here is how to reach us and the quickest fixes for the common ones."
      current="/support"
    >
      <Clause label="Contact">
        <p>
          Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            {SUPPORT_EMAIL}
          </a>
          . For anything tied to your account, write from the email address on the
          account so we can find it. We reply within two business days.
        </p>
      </Clause>

      <Clause label="Manage or cancel your subscription">
        <p>
          The BLOCK27 subscription is billed by Apple. Change the plan or cancel it
          in your Apple account settings: App Store → your name → Subscriptions, or
          iOS Settings → your name → Subscriptions. Cancelling stops future
          renewals; your access runs to the end of the period you have paid for.
        </p>
      </Clause>

      <Clause label="Refunds">
        <p>
          In-app purchases are refunded by Apple, not by us — request one at{" "}
          <a
            href="https://reportaproblem.apple.com"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            reportaproblem.apple.com
          </a>
          . Our{" "}
          <a
            href="/refund"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Refund Policy
          </a>{" "}
          has the details.
        </p>
      </Clause>

      <Clause label="Delete your account">
        <p>
          You can delete your account and everything in it from{" "}
          <strong className="text-paper">Settings</strong> in the app, or by
          emailing us. Full steps and what gets removed are on the{" "}
          <a
            href="/delete-account"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            account-deletion page
          </a>
          .
        </p>
      </Clause>

      <Clause label="A bug or something broken">
        <p>
          Email {SUPPORT_EMAIL} and tell us what you did and what happened. A
          screenshot and your device/app version help. We read every message.
        </p>
      </Clause>

      <Clause label="Your data and privacy">
        <p>
          What we collect and who processes it is in our{" "}
          <a
            href="/privacy"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Privacy Policy
          </a>
          . To ask what we hold about you, or to have it removed, email{" "}
          {SUPPORT_EMAIL}.
        </p>
      </Clause>
    </LegalShell>
  );
}

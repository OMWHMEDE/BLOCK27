import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Privacy",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy."
      intro="You photograph your wardrobe. We treat your photos as sensitive data. This is what we collect, who processes it, how long we keep it, and your rights."
      current="/privacy"
    >
      <Clause label="Who we are">
        <p>
          BLOCK27 (&ldquo;BLOCK27&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
          operates the BLOCK27 application and website at block27.app (the
          &ldquo;Service&rdquo;), an AI personal styling tool. Questions about
          this policy or your data: {SUPPORT_EMAIL}.
        </p>
      </Clause>

      <Clause label="What this policy covers">
        <p>
          This policy explains what information we collect, how we use it, who we
          share it with, how long we keep it, and your rights. By using BLOCK27
          you agree to this policy.
        </p>
      </Clause>

      <Clause label="What we collect">
        <p>
          <strong className="text-paper">Account information.</strong> Your email
          address and password (passwords are stored securely and hashed by our
          authentication provider).
        </p>
        <p>
          <strong className="text-paper">Photos you upload.</strong> Photos of
          your clothing (&ldquo;garment photos&rdquo;). These are the core of the
          Service — used to analyse your wardrobe and generate outfit and shopping
          suggestions.
        </p>
        <p>
          <strong className="text-paper">Usage information.</strong> Basic
          information about how you use the Service (features used, plan limits),
          used to operate the product and enforce limits.
        </p>
        <p>
          <strong className="text-paper">Payment information.</strong> If you
          purchase a subscription in the iOS app, payment is processed by Apple
          through in-app purchase. We do not receive or store your card or payment
          details; Apple handles them.
        </p>
      </Clause>

      <Clause label="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Provide the Service — analyse your clothes, generate outfits, and
            produce shopping suggestions.
          </li>
          <li>
            Operate your account, enforce plan limits, and provide support.
          </li>
          <li>Process subscription payments (through Apple) for paid plans.</li>
          <li>Maintain the security and integrity of the Service.</li>
        </ul>
        <p>
          <strong className="text-paper">
            We do not sell your personal information.
          </strong>
        </p>
      </Clause>

      <Clause label="Third-party processors">
        <p>
          To provide the Service, we share certain data with providers who
          process it on our behalf:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-paper">Supabase</strong> — hosting, database,
            authentication, and storage (your account data and photos are stored
            here).
          </li>
          <li>
            <strong className="text-paper">Anthropic</strong> — AI analysis of
            your uploaded garment photos.
          </li>
          <li>
            <strong className="text-paper">Apple</strong> — payment processing for
            subscriptions purchased in the iOS app (in-app purchase). Apple is the
            merchant of record for these purchases.
          </li>
          <li>
            <strong className="text-paper">Sentry</strong> — application error
            monitoring. When the app hits an error, Sentry receives diagnostic
            data about that error. We configure it to exclude personal data — no
            photos, no request contents, no email addresses — but it does receive
            your account&rsquo;s user id attached to error reports, so we can trace
            a fault to the affected account.
          </li>
          <li>
            <strong className="text-paper">Vercel</strong> — application
            hosting/infrastructure.
          </li>
          <li>
            <strong className="text-paper">Resend</strong> — sending account and
            support emails.
          </li>
        </ul>
        <p>
          We share only what is necessary for each to perform its function. The
          garment photos you upload are sent to Anthropic for AI analysis as
          described above; they are not sent to any other processor.
        </p>
      </Clause>

      <Clause label="How long we keep your data">
        <p>
          We keep your account data and photos while your account is active. When
          you delete your account or specific photos/garments, we delete the
          associated data and files from our storage. Some limited information
          may be retained where required for legal, security, or operational
          reasons. Third-party processors handle retention under their own
          policies.
        </p>
      </Clause>

      <Clause label="Photos are never training data">
        <p>
          The garment photos you upload are used only to run the Service for you —
          analysing your wardrobe and producing outfit and shopping suggestions.
          They are <strong>never sold</strong> and are{" "}
          <strong>never used to train AI models</strong>, ours or anyone
          else&rsquo;s.
        </p>
      </Clause>

      <Clause label="Your rights and choices">
        <p>You can:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-paper">Access and update</strong> your
            account information in the app.
          </li>
          <li>
            <strong className="text-paper">Delete</strong> individual
            photos/garments in the app, or delete your entire account — which
            removes your associated data and files from our storage. See{" "}
            <a
              href="/delete-account"
              className="text-paper underline underline-offset-4 hover:text-bone"
            >
              how to delete your account
            </a>
            .
          </li>
          <li>
            <strong className="text-paper">Request information</strong> about your
            data by emailing {SUPPORT_EMAIL}.
          </li>
        </ul>
        <p>
          If you are in the EU/UK, you have rights under GDPR/UK GDPR — access,
          correction, deletion, restriction, objection, and portability. To
          exercise these, contact {SUPPORT_EMAIL}. You may also lodge a complaint
          with a data protection authority.
        </p>
        <p>
          <strong className="text-paper">Legal basis (EU/UK users).</strong> We
          process your data to perform our contract with you (providing the
          Service), based on your consent (for uploading and processing your
          photos), and for our legitimate interests in operating and securing the
          Service.
        </p>
      </Clause>

      <Clause label="Age requirement">
        <p>
          BLOCK27 is not directed to children under 16. We do not knowingly
          collect personal information from anyone under 16. We ask you to confirm
          you are 16 or older at signup. If you believe someone under 16 has
          provided us data, contact us and we will delete it.
        </p>
      </Clause>

      <Clause label="Data security">
        <p>
          We use reasonable technical and organizational measures to protect your
          data, including secure authentication and access controls. No system is
          perfectly secure, but we work to protect your information.
        </p>
      </Clause>

      <Clause label="International transfers">
        <p>
          We and our providers may process your data in countries other than
          where you live, including the United States and the European Union.
          Where required, we rely on appropriate safeguards for such transfers.
        </p>
      </Clause>

      <Clause label="Changes to this policy">
        <p>
          We may update this policy. We will post the updated version with a new
          &ldquo;last updated&rdquo; date. Material changes will be communicated
          where appropriate.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Questions or requests: {SUPPORT_EMAIL}.</p>
      </Clause>
    </LegalShell>
  );
}

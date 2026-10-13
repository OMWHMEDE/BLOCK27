import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

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
      <Clause label="Agreement">
        <p>
          These Terms govern your use of BLOCK27 (the &ldquo;Service&rdquo;). By
          creating an account or using the Service, you agree to these Terms. If
          you do not agree, do not use the Service.
        </p>
      </Clause>

      <Clause label="Who can use BLOCK27">
        <p>
          You must be at least 16 years old to use BLOCK27. By using it, you
          confirm you are 16 or older. We ask you to confirm this at signup.
        </p>
      </Clause>

      <Clause label="Your account">
        <p>
          You are responsible for your account and for keeping your login secure.
          Provide accurate information and don&rsquo;t share your account. Notify
          us of unauthorized use at {SUPPORT_EMAIL}.
        </p>
      </Clause>

      <Clause label="What BLOCK27 does">
        <p>
          BLOCK27 is an AI styling tool. You upload photos of your clothes; the
          Service analyses them, suggests outfits, tells you what your wardrobe is
          missing, and recommends what to buy. AI outputs are suggestions — they
          may not be perfect or accurate, and are provided &ldquo;as is&rdquo; for
          your personal, non-commercial use.
        </p>
      </Clause>

      <Clause label="Your content and rights">
        <p>
          <strong className="text-paper">
            You keep ownership of the photos you upload.
          </strong>{" "}
          By uploading, you grant BLOCK27 a limited licence to store, process, and
          share your garment photos with our third-party AI processor (as
          described in the{" "}
          <a
            href="/privacy"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Privacy Policy
          </a>
          ) solely to provide the Service to you.
        </p>
        <p>You promise that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>The photos you upload are yours or you have the right to use them.</li>
          <li>
            You will not upload photos of other people (including celebrities)
            without their permission.
          </li>
          <li>You will not upload illegal, infringing, or inappropriate content.</li>
        </ul>
      </Clause>

      <Clause label="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Upload content that is illegal, harmful, infringing, or violates
            others&rsquo; rights.
          </li>
          <li>
            Upload photos of real people (including celebrities) without their
            consent.
          </li>
          <li>Misuse, hack, overload, reverse-engineer, or disrupt the Service.</li>
          <li>Use the Service to create misleading, deceptive, or harmful content.</li>
          <li>
            Resell or commercially exploit the Service or its outputs without our
            permission.
          </li>
        </ul>
        <p>We may suspend or terminate accounts that violate these Terms.</p>
      </Clause>

      <Clause label="Plans, billing, and cancellation">
        <p>Higher limits require a paid subscription. Current plans:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-paper">Free</strong> — wardrobe analysis,
            outfit generation, and shopping suggestions, at the free monthly
            limits (10 pieces, 5 outfit generations, 3 shopping consultations).
          </li>
          <li>
            <strong className="text-paper">BLOCK27</strong> —{" "}
            <strong className="text-paper">$9.99/month</strong> or{" "}
            <strong className="text-paper">$79.99/year</strong>. Raises the limits
            to 150 pieces, 45 outfit generations, and 15 shopping consultations a
            month.
          </li>
        </ul>
        <p>
          In the iOS app, subscriptions are sold and billed by{" "}
          <strong className="text-paper">Apple</strong> through in-app purchase.
          The charge appears on your Apple account.
        </p>
        <p>
          <strong className="text-paper">Renewal.</strong> Subscriptions renew
          automatically at the end of each period (monthly or yearly) unless you
          turn off auto-renew at least 24 hours before the period ends, as
          required by Apple.
        </p>
        <p>
          <strong className="text-paper">Cancellation.</strong> Manage or cancel
          your subscription any time in your Apple account settings (App Store →
          your name → Subscriptions, or iOS Settings → your name → Subscriptions).
          Cancelling stops future renewals; your access continues until the end of
          the period you have already paid for.
        </p>
      </Clause>

      <Clause label="Refunds">
        <p>
          Purchases made in the iOS app are processed by Apple, so refunds are
          handled by Apple under its policy — request one at{" "}
          <a
            href="https://reportaproblem.apple.com"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            reportaproblem.apple.com
          </a>
          . We cannot directly refund an Apple purchase. Nothing here removes any
          refund right you have under the consumer law that applies to you. See
          our{" "}
          <a
            href="/refund"
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            Refund Policy
          </a>{" "}
          for details.
        </p>
      </Clause>

      <Clause label="AI outputs disclaimer">
        <p>
          BLOCK27 uses AI to analyse clothes and generate styling and shopping
          suggestions. These outputs:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>May be inaccurate, imperfect, or not to your taste.</li>
          <li>Are generated automatically for your personal styling use.</li>
          <li>Should not be relied on as professional advice.</li>
        </ul>
      </Clause>

      <Clause label="Service availability">
        <p>
          We provide the Service &ldquo;as is&rdquo; and &ldquo;as
          available.&rdquo; We may modify, suspend, or discontinue features at any
          time. We don&rsquo;t guarantee the Service will always be available or
          error-free.
        </p>
      </Clause>

      <Clause label="Limitation of liability">
        <p>
          To the maximum extent permitted by law, BLOCK27 is not liable for
          indirect, incidental, or consequential damages, or for loss of data,
          arising from your use of the Service. Our total liability is limited to
          the amount you paid us in the 12 months before the claim (or, if you
          paid nothing, a nominal amount).
        </p>
      </Clause>

      <Clause label="Indemnity">
        <p>
          You agree to indemnify BLOCK27 against claims arising from your misuse
          of the Service or violation of these Terms, including uploading content
          you didn&rsquo;t have the right to upload.
        </p>
      </Clause>

      <Clause label="Termination">
        <p>
          You can stop using BLOCK27 and delete your account at any time. We may
          suspend or terminate your access if you violate these Terms.
        </p>
      </Clause>

      <Clause label="Governing law">
        <p>
          These Terms are governed by the laws of the Islamic Republic of
          Mauritania, where BLOCK27 is operated, without regard to conflict-of-law
          principles. However, nothing in these Terms removes any mandatory legal
          rights you have as a consumer in your country of residence. If you are
          located in the European Union, the United Kingdom, or another region
          with mandatory consumer-protection or data-protection laws, you keep the
          rights granted to you by those laws, and nothing here overrides them.
          Disputes will be handled in the courts of Mauritania where permitted,
          but this does not deprive you of protections available under the
          mandatory law of your home country.
        </p>
      </Clause>

      <Clause label="Changes to these Terms">
        <p>
          We may update these Terms. Continued use after changes means you accept
          the updated Terms.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Questions: {SUPPORT_EMAIL}.</p>
      </Clause>
    </LegalShell>
  );
}

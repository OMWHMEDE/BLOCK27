import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Privacy",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy."
      intro="You send us photographs of your body. We treat them as the most sensitive thing we hold. This is what we collect, who processes it, how long we keep it, and your rights."
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
          yourself (&ldquo;base photos&rdquo;) and photos of your clothing
          (&ldquo;garment photos&rdquo;). These are the core of the Service —
          used to analyse your wardrobe, generate outfit suggestions, and (for
          paid features) produce virtual try-on images.
        </p>
        <p>
          <strong className="text-paper">Usage information.</strong> Basic
          information about how you use the Service (features used, plan limits),
          used to operate the product and enforce limits.
        </p>
        <p>
          <strong className="text-paper">Payment information.</strong> If you
          purchase a paid plan, payments are processed by our third-party
          processor (Whop). We do not store your full card or payment details;
          those are handled by the processor.
        </p>
      </Clause>

      <Clause label="How we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Provide the Service — analyse your clothes, generate outfits, and
            (for paid users) create try-on images.
          </li>
          <li>
            Operate your account, enforce plan limits, and provide support.
          </li>
          <li>Process payments (via our processor) for paid plans.</li>
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
            your uploaded garment and base photos.
          </li>
          <li>
            <strong className="text-paper">FASHN</strong> — AI virtual try-on
            image generation for paid &ldquo;see it on you&rdquo; features
            (processes your base and garment images).
          </li>
          <li>
            <strong className="text-paper">Whop</strong> — payment processing for
            paid plans.
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
          We share only what is necessary for each to perform its function.
          Photos you upload are sent to Anthropic and FASHN for AI processing as
          described above.
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

      <Clause label="Biometric data — retention and destruction (DRAFT — pending legal review)">
        <p>
          <strong>
            DRAFT. This section has not yet been reviewed by counsel and is not
            legal advice. Do not rely on it until it has been reviewed and
            approved.
          </strong>
        </p>
        <p>
          <strong>What we collect and why.</strong> To provide the virtual
          try-on, we collect a full-body photograph of you (your &ldquo;base
          photo&rdquo;) and generate images of you wearing garments from your
          wardrobe (&ldquo;renders&rdquo;). Your base photo and the renders made
          from it are biometric information. We collect and process them only to
          generate and show you these try-on images, and for no other purpose.
        </p>
        <p>
          <strong>Consent and age.</strong> We do not collect a base photo or
          generate any render until you have given explicit consent to this
          processing and confirmed that you are 18 years of age or older. If we
          change what you are consenting to, we ask for your consent again before
          continuing. You can withdraw consent at any time by removing your base
          photo or deleting your account.
        </p>
        <p>
          <strong>Who processes the images.</strong> To generate a render, your
          base photo and the relevant garment image are sent to our rendering
          provider, FASHN, which performs the image generation on our behalf as a
          processor. Your images are <strong>never sold</strong> and are{" "}
          <strong>never used to train AI models</strong> — ours or anyone
          else&rsquo;s. FASHN states that it does not use customer content to
          train or fine-tune AI models, and that generated API outputs are
          scheduled for deletion on its systems within a short retention window
          (currently three days for delivered outputs). We link to FASHN&rsquo;s
          data-retention policy and keep this description current.
        </p>
        <p>
          <strong>How long we keep them, and when they are destroyed.</strong> We
          keep your base photo and renders only while you have an active base
          photo. We destroy them — the base photo and every render derived from
          it — in each of these cases:
        </p>
        <p>
          (a) immediately when you remove your base photo; (b) immediately when
          you delete your account, along with the rest of your data; and (c)
          automatically after 12 months of inactivity, even if you take no action.
          Destruction means the image files are deleted from our storage, not
          merely hidden. Records that prove you consented (the consent version,
          timestamp, and related metadata — never the images) may be retained as
          required to evidence compliance.
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
            photos/garments, or delete your entire account, which removes your
            associated data and files from our storage.
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
          where you live, including the United States. Where required, we rely on
          appropriate safeguards for such transfers.
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

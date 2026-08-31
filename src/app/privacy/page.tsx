import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Privacy",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy."
      intro="You send us photographs of your body. We treat them as the most sensitive thing we hold. This is exactly what we collect, where it goes, and how you remove it."
      current="/privacy"
    >
      <Clause label="Who we are">
        <p>
          BLOCK27 (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an AI personal styling
          service. It reads photos of the clothes you own and renders chosen
          outfits onto a photo of you. This policy explains how we handle your
          data. BLOCK27 is for people aged 16 and over. Questions:{" "}
          {SUPPORT_EMAIL}.
        </p>
      </Clause>

      <Clause label="What we collect">
        <p>
          <strong className="text-paper">Photos.</strong> A base photo of you,
          photos of your garments, and the try-on images we render from them.
          This is body photography and we treat it as such.
        </p>
        <p>
          <strong className="text-paper">Account information.</strong> Your email
          address, and an optional display name and avatar you choose to add.
        </p>
        <p>
          <strong className="text-paper">Subscription status.</strong> Whether
          your account is free or paid, which plan, and your usage counts.
          Payments are handled by our payment processor (see below); we do not
          receive or store your full card details.
        </p>
      </Clause>

      <Clause label="How we use it">
        <p>
          We use your photos for one purpose: to run the service you asked for —
          analysing each garment, composing outfits, and rendering the chosen
          outfit onto your base photo. We use your account information to operate
          your account, send you essential account and billing emails, and
          enforce plan limits. We do not use your photos for advertising, and we
          never use them to train AI models.
        </p>
      </Clause>

      <Clause label="Third-party processors">
        <p>
          To provide the service, your data is processed by the following
          providers on our behalf. We are transparent about this rather than
          claim no one else ever touches your images:
        </p>
        <p>
          <strong className="text-paper">Supabase</strong> — stores your account
          data and your photos, in private storage buckets, encrypted at rest.
          Photos are served only through short-lived signed URLs, never public
          links.
        </p>
        <p>
          <strong className="text-paper">Anthropic</strong> — your garment and
          base photos are sent to Anthropic&rsquo;s Claude models to analyse each
          garment into text and to screen uploads, under Anthropic&rsquo;s API
          terms. Processed to serve your request, not to train their models.
        </p>
        <p>
          <strong className="text-paper">FASHN</strong> — to render a try-on,
          your base photo and the chosen garment images are sent to FASHN&rsquo;s
          virtual try-on service, which returns the rendered image.
        </p>
        <p>
          <strong className="text-paper">Whop</strong> — our payment processor
          and merchant of record. It handles checkout and card details and tells
          us only whether your subscription is active; we never see your full
          card number.
        </p>
        <p>
          <strong className="text-paper">Vercel</strong> — hosts the application
          and processes the technical request and log data needed to serve it.
        </p>
        <p>
          <strong className="text-paper">Resend</strong> — sends our transactional
          account emails (from noreply@block27.app) and receives your email
          address to deliver them.
        </p>
      </Clause>

      <Clause label="How your photos are protected">
        <p>
          Photos are encrypted in transit and at rest, kept in private buckets,
          and reachable only through short-lived signed URLs — never a public
          object URL. There is no admin screen that displays your photos; the
          promise is that no human sees them in normal operation, and no tool
          exists that would make that easy.
        </p>
      </Clause>

      <Clause label="Keeping and deleting your data">
        <p>
          We keep your data for as long as your account exists. You can delete
          your account at any time from Settings. Deletion is real: it removes
          your database records and your stored files, not a hidden flag. Data
          held by our processors is deleted in line with their retention terms.
        </p>
        <p>
          If you use BLOCK27 before creating an account, that anonymous data is
          automatically purged after a short period.
        </p>
      </Clause>

      <Clause label="We do not sell your data">
        <p>
          We do not sell your data, and we do not share it with anyone beyond the
          processors listed above who run the service for us. Your photos are
          never sold, never shared for advertising, and never used as training
          data.
        </p>
      </Clause>

      <Clause label="Your rights">
        <p>
          Depending on where you live — and if you are in the EU or UK, under the
          GDPR — you have the right to access the data we hold about you, to
          correct it, to have it deleted, to receive a copy in a portable form,
          and to object to or restrict certain processing. You can exercise most
          of these directly from Settings, or by emailing {SUPPORT_EMAIL}. If you
          are in the EU or UK, you also have the right to complain to your local
          data-protection authority.
        </p>
      </Clause>

      <Clause label="International transfers">
        <p>
          Some of our processors operate outside your country, including in the
          United States. Where your data is transferred internationally, it is
          done under the safeguards those providers offer for lawful transfer.
        </p>
      </Clause>

      <Clause label="Children">
        <p>
          BLOCK27 is not for anyone under 16. We do not knowingly collect data
          from people under 16; if we learn we have, we delete it.
        </p>
      </Clause>

      <Clause label="Changes">
        <p>
          We may update this policy as the product grows. Material changes will
          be made plain, and the &ldquo;last updated&rdquo; date above will
          change.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Privacy questions: {SUPPORT_EMAIL}.</p>
      </Clause>
    </LegalShell>
  );
}

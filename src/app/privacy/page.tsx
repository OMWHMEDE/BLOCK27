import { LegalShell, Clause } from "@/components/LegalShell";

// PLACEHOLDER legal copy — accurate to how the product works, but pending a real
// lawyer's review before full public launch. See LegalShell for the shared note.
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
          data. Questions: privacy@block27.app.
        </p>
      </Clause>

      <Clause label="What we collect">
        <p>
          <strong className="text-paper">Photos.</strong> A base photo of you, photos
          of your garments, and the try-on images we render from them. This is
          body photography and we treat it as such.
        </p>
        <p>
          <strong className="text-paper">Account information.</strong> Your email
          address, and an optional display name and avatar you choose to add.
        </p>
        <p>
          <strong className="text-paper">Subscription status.</strong> Whether your
          account is free or paid, and your usage counts. Payments are handled by
          our payment processor (see below); we do not receive or store your full
          card details.
        </p>
      </Clause>

      <Clause label="How we use it">
        <p>
          We use your photos for one purpose: to run the service you asked for —
          analysing each garment, composing outfits, and rendering the chosen
          outfit onto your base photo. We use your account information to operate
          your account and enforce plan limits.
        </p>
      </Clause>

      <Clause label="Third-party processors">
        <p>
          To provide the service, your photos are sent to third-party AI
          providers that process them on our behalf. We are transparent about
          this rather than claim no one ever sees your images:
        </p>
        <p>
          <strong className="text-paper">Anthropic</strong> — garment photos are
          analysed by Anthropic&rsquo;s Claude models to produce a text
          description of each item.
        </p>
        <p>
          <strong className="text-paper">FASHN</strong> — your base photo and garment
          photos are sent to FASHN to render the virtual try-on image.
        </p>
        <p>
          We also rely on <strong className="text-paper">Supabase</strong> (encrypted
          storage, database, and authentication),{" "}
          <strong className="text-paper">Vercel</strong> (hosting), and{" "}
          <strong className="text-paper">Paddle</strong> (our payment processor and
          merchant of record for subscriptions). Each processes only the data
          needed for its function.
        </p>
      </Clause>

      <Clause label="How it is stored">
        <p>
          Photos are encrypted in transit and at rest, held in private storage,
          and served only through short-lived signed links that expire in
          minutes. There is no public URL to any photo of you.
        </p>
      </Clause>

      <Clause label="What we never do">
        <p>
          We do not sell your data. We do not use your photos to train our own
          models, and we do not share them beyond the processors named above that
          are required to deliver the service.
        </p>
      </Clause>

      <Clause label="Retention and deletion">
        <p>
          We keep your data while your account is active. You can delete it at
          any time: Settings &rarr; Delete account removes your records and files
          — base photo, garments, renders, avatar — from our storage, database,
          and authentication system. Deletion is real and permanent; it does not
          come back.
        </p>
        <p>
          To request deletion or a copy of your data another way, email
          privacy@block27.app.
        </p>
      </Clause>

      <Clause label="Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          export, or delete your personal data, and to object to certain
          processing. The delete-account flow covers erasure directly; for any
          other request, contact us and we will respond.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>Questions about your data: privacy@block27.app.</p>
      </Clause>
    </LegalShell>
  );
}

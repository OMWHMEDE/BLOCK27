import { LegalShell, Clause } from "@/components/LegalShell";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata = {
  title: "BLOCK27 — Delete your account",
};

// Public, sign-in-free account-deletion page. Apple and Google Play both require
// a URL anyone can reach that explains how to delete the account and what is
// removed. It is on the shopfront allowlist so it resolves while the rest of the
// site is a landing page. Brand frame via LegalShell — void ground, hairlines,
// zero radius.
export default function DeleteAccountPage() {
  return (
    <LegalShell
      title="Delete account."
      intro="How to delete your BLOCK27 account, and exactly what is removed when you do."
      current="/delete-account"
    >
      <Clause label="Delete it in the app">
        <p>
          Open the BLOCK27 app, go to <strong className="text-paper">Settings</strong>{" "}
          and choose <strong className="text-paper">Delete account</strong>.
          Deletion is immediate and permanent — your account and the data below
          are removed from our storage straight away.
        </p>
      </Clause>

      <Clause label="Or ask us to delete it">
        <p>
          You do not need the app to delete your account. Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          from the email address on your account and ask us to delete it. We verify
          the request and complete the deletion within 30 days — usually much
          sooner.
        </p>
      </Clause>

      <Clause label="What gets deleted">
        <p>When your account is deleted, we remove:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>your account and login;</li>
          <li>every photo you uploaded (your garment images and their thumbnails);</li>
          <li>your wardrobe analysis, generated outfits, and shopping data;</li>
          <li>your usage and plan records tied to the account.</li>
        </ul>
        <p>
          Deletion is real: the files are removed from storage and the database
          rows are deleted — not hidden behind a flag.
        </p>
      </Clause>

      <Clause label="What may remain, and for how long">
        <p>
          We may keep a small amount of information where the law requires it — for
          example, records needed for tax, accounting, or fraud-prevention
          purposes. Payment and subscription records for purchases made through
          Apple are held by Apple under its own policies. We never retain your
          photos, and anything we are required to keep is kept only for as long as
          the law requires and then deleted.
        </p>
      </Clause>

      <Clause label="This cannot be undone">
        <p>
          Deleting your account is permanent. If you want to use BLOCK27 again
          afterwards, you will need to create a new account and re-add your
          wardrobe.
        </p>
      </Clause>

      <Clause label="Contact">
        <p>
          Questions about deletion:{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-paper underline underline-offset-4 hover:text-bone"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </Clause>
    </LegalShell>
  );
}

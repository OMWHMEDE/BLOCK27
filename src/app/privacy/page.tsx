import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

// PLACEHOLDER legal copy in the brand voice, drawn from the privacy stance in
// CLAUDE.md. Have a lawyer review before a real launch.
export const metadata = {
  title: "BLOCK27 — Privacy",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <Link href="/" className="mb-16 inline-block">
        <Wordmark />
      </Link>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Privacy.
      </h1>
      <p className="text-ash max-w-md mb-12">
        You send us photographs of your body. We treat them as the most sensitive
        thing we hold. Here is exactly how.
      </p>

      <Clause label="What we hold">
        Your base photo, your garment photos, your renders, an optional avatar,
        and your email. Nothing else about you.
      </Clause>
      <Clause label="Where they live">
        Encrypted, in private storage. Every image is served through a signed link
        that expires in minutes. There is no public URL to any photo of you.
      </Clause>
      <Clause label="Who sees them">
        No human, in normal operation. There is no admin screen that displays your
        photos — we did not build the tool that would make a breach easy.
      </Clause>
      <Clause label="What we never do">
        Your photos are never training data. Never sold. Never shared.
      </Clause>
      <Clause label="Deletion">
        Real deletion means real deletion. Settings → Delete account removes every
        row and every file — base photo, garments, renders, avatar. It does not
        come back, and that is the point.
      </Clause>
      <Clause label="Contact">
        Questions about your data: privacy@block27.app.
      </Clause>
    </main>
  );
}

function Clause({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-iron pt-8 pb-10">
      <p className="text-xs uppercase tracking-[0.08em] text-ash mb-4">{label}</p>
      <p className="text-bone leading-snug max-w-md">{children}</p>
    </section>
  );
}

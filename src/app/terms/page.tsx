import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

// PLACEHOLDER legal copy in the brand voice. Have a lawyer review before a real
// launch.
export const metadata = {
  title: "BLOCK27 — Terms",
};

export default function TermsPage() {
  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <Link href="/" className="mb-16 inline-block">
        <Wordmark />
      </Link>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        Terms.
      </h1>
      <p className="text-ash max-w-md mb-12">
        Plain terms for using BLOCK27. Use the product and you accept them.
      </p>

      <Clause label="What this is">
        A menswear styling tool. It reads the clothes you own, decides what to
        wear, and renders it on your body. It is provided as-is.
      </Clause>
      <Clause label="Your content">
        Your photos stay yours. You give us permission to process them for one
        purpose: to analyze your wardrobe and render your outfits. Nothing else.
      </Clause>
      <Clause label="Acceptable use">
        Upload photographs of yourself and your own clothing. Nude, revealing, or
        inappropriate photos are rejected and not stored. Repeated attempts end
        the account.
      </Clause>
      <Clause label="Renders">
        Free accounts get 3 renders. A failed render never counts against you and
        you are never charged for one.
      </Clause>
      <Clause label="Changes">
        We may change these terms as the product grows. Material changes will be
        made plain, not buried.
      </Clause>
      <Clause label="Contact">
        support@block27.app.
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

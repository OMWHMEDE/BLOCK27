import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGarmentDetail, type GarmentDetail } from "@/lib/supabase/storage";
import { formalityLabel, type GarmentAnalysis } from "@/lib/brain/types";
import { DeleteGarment } from "./DeleteGarment";

export default async function GarmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const garment = user ? await getGarmentDetail(user.id, id) : null;
  if (!garment) notFound();

  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <div className="flex items-baseline justify-between mb-16">
        <span className="text-sm tracking-tight">BLOCK27</span>
        <Link
          href="/wardrobe"
          className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
        >
          Wardrobe
        </Link>
      </div>

      <div className="flex flex-col gap-10 sm:flex-row sm:gap-10">
        <div className="w-full max-w-[16rem] shrink-0 aspect-[3/4] bg-void overflow-hidden border border-iron">
          {garment.url ? (
            // Private object via a 300s signed URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={garment.url}
              alt="Garment"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <GarmentBody garment={garment} />
        </div>
      </div>

      <div className="mt-16 border-t border-iron pt-8">
        <DeleteGarment id={garment.id} />
      </div>
    </main>
  );
}

function GarmentBody({ garment }: { garment: GarmentDetail }) {
  const { status, analysis, reject_reason } = garment;

  if (status === "analyzed" && analysis) {
    return <Analyzed a={analysis} />;
  }

  if (status === "rejected") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-bone leading-snug max-w-md">
          {reject_reason || "This photo won't read. Shoot it again — flat, even light, whole garment in frame."}
        </p>
        <Link
          href="/garments/new"
          className="self-start border border-iron text-bone px-5 py-3 uppercase tracking-wide text-sm hover:border-paper hover:text-paper"
        >
          Reshoot
        </Link>
      </div>
    );
  }

  // pending / analyzing
  return (
    <p className="text-ash leading-snug max-w-md">
      I&rsquo;m still reading this piece. Give it a moment, then refresh.
    </p>
  );
}

function Analyzed({ a }: { a: GarmentAnalysis }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight leading-[0.95]">
          {a.descriptor}
        </h1>
        {a.summary ? (
          <p className="text-ash mt-2 leading-snug">{a.summary}</p>
        ) : null}
      </div>

      {/* The taste note — where the value is. */}
      {a.read ? <p className="text-bone leading-snug max-w-md">{a.read}</p> : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
        <Row label="Type">
          {[a.category, a.subcategory].filter(Boolean).join(" · ")}
        </Row>
        <Row label="Color">{a.colors?.filter(Boolean).join(", ")}</Row>
        <Row label="Pattern">{a.pattern}</Row>
        <Row label="Material">{a.material_guess}</Row>
        <Row label="Fit">{a.fit}</Row>
        <Row label="Formality">{formalityLabel(a.formality)}</Row>
        <Row label="Season">{a.seasons?.filter(Boolean).join(", ")}</Row>
        <Row label="Pairs with">{a.pairs_with}</Row>
        <Row label="Clashes with">{a.clashes_with}</Row>
      </dl>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const value = typeof children === "string" ? children.trim() : children;
  if (!value) return null;
  return (
    <>
      <dt className="text-ash uppercase tracking-[0.08em] text-xs pt-0.5">
        {label}
      </dt>
      <dd className="text-bone">{value}</dd>
    </>
  );
}

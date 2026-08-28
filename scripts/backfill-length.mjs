#!/usr/bin/env node
// One-off backfill: write the new `length` field into every existing garment's
// analysis JSON. New uploads get length from the analysis model; this fills it
// in for garments analyzed before the field existed, so the render instruction
// is populated everywhere — not just on garments added after the deploy.
//
// It derives length the same way the render fallback does (from subcategory /
// descriptor / fit), deterministically and for free — no model call. `length`
// lives inside the existing analysis JSONB, so there is no schema migration.
//
// SAFE TO RE-RUN. It only writes a row whose stored length is missing or "none"
// on a leg garment, and never overwrites a real length the model already set.
//
// USAGE (run where the service-role key lives — NOT in the browser/app):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/backfill-length.mjs           # dry run: reports, writes nothing
//   node scripts/backfill-length.mjs --apply   # actually writes

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

if (!URL || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Keep these in lockstep with src/lib/render/lengthInstruction.ts.
const WIDE_FIT = /\b(wide|baggy|loose|relaxed|oversized|balloon|carpenter|cargo|flare|flared|palazzo)\b/;
const SHORTS_TEXT = /\bshorts?\b/;
const CROP_TEXT = /\bcropp?ed?\b|\bcapri\b|\b7\/8\b|\bankle-length\b/;
const VALID = new Set(["full-length", "wide-leg", "cropped", "shorts", "none"]);

function deriveLength(a) {
  const isLeg = a.category === "bottoms" || a.category === "one-piece";
  if (!isLeg) return "none";
  const text = `${a.subcategory ?? ""} ${a.descriptor ?? ""}`.toLowerCase();
  if (SHORTS_TEXT.test(text)) return "shorts";
  if (CROP_TEXT.test(text)) return "cropped";
  const wide = WIDE_FIT.test(text) || WIDE_FIT.test((a.fit ?? "").toLowerCase());
  return wide ? "wide-leg" : "full-length";
}

const db = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAGE = 500;
let from = 0;
let scanned = 0;
let toWrite = 0;
let written = 0;

console.log(APPLY ? "APPLY mode — writing changes.\n" : "DRY RUN — no writes. Pass --apply to write.\n");

for (;;) {
  const { data, error } = await db
    .from("garments")
    .select("id, analysis")
    .not("analysis", "is", null)
    .range(from, from + PAGE - 1);
  if (error) {
    console.error("read failed:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;

  for (const row of data) {
    scanned++;
    const a = row.analysis;
    if (!a || typeof a !== "object") continue;

    // Already has a real length? Leave it — the model is authoritative.
    if (typeof a.length === "string" && VALID.has(a.length) && a.length !== "none") {
      continue;
    }
    const isLeg = a.category === "bottoms" || a.category === "one-piece";
    const next = isLeg ? deriveLength(a) : "none";
    // Nothing would change (non-leg already effectively "none", or unchanged).
    if (a.length === next) continue;

    toWrite++;
    const preview = `${row.id.slice(0, 8)} ${a.category}/${a.subcategory ?? "?"} → length=${next}`;
    if (!APPLY) {
      console.log("would set:", preview);
      continue;
    }
    const { error: upErr } = await db
      .from("garments")
      .update({ analysis: { ...a, length: next } })
      .eq("id", row.id);
    if (upErr) {
      console.error("write failed for", row.id, upErr.message);
      continue;
    }
    written++;
    console.log("set:", preview);
  }

  if (data.length < PAGE) break;
  from += PAGE;
}

console.log(
  `\nScanned ${scanned}. ${APPLY ? `Wrote ${written}.` : `${toWrite} would be written (dry run).`}`,
);

import type {
  Hand,
  ImageRef,
  RenderCategory,
  RenderResult,
} from "@/lib/hand/types";
import {
  signedUrl,
  uploadToUserPhotos,
} from "@/lib/supabase/storage";

// The FASHN provider. One garment layer per call: dress `person` in `garment`,
// store the result at `out`. It runs inside a request, so the storage helpers
// (user-scoped, RLS) resolve and write the user's own paths.
//
// FASHN_API_KEY is read at call time, backend only. FASHN_MODEL defaults to
// tryon-max — the maximum-quality model. There is no standard tier: max runs at
// generation_mode "quality" and FASHN_RESOLUTION (default 2k); v1.6 runs at
// mode "quality". Output is PNG so chained passes never re-compress each other.

const RUN_URL = "https://api.fashn.ai/v1/run";
const STATUS_URL = "https://api.fashn.ai/v1/status";
const MODEL = process.env.FASHN_MODEL ?? "tryon-max";
const RESOLUTION = process.env.FASHN_RESOLUTION ?? "2k"; // tryon-max only

// tryon-max regenerates at up to 2k/4k and is a 4-credit call; v1.6 is 1 credit
// at a fixed 864×1296. Both take different input shapes — branch on the name.
const isMaxModel = MODEL.includes("max");

const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_500;
const SIGN_SECONDS = 600; // long enough for FASHN to fetch the inputs
// tryon-max 2k @ quality = 4 credits × $0.075 = $0.30. Informational only.
const COST_ESTIMATE_USD = isMaxModel ? 0.3 : 0.075;

function fashnCategory(c: RenderCategory): string {
  return c === "one-piece" ? "one-pieces" : c;
}

// tryon-max takes product_image + resolution + generation_mode and auto-detects
// the category. v1.6 takes garment_image + category + mode. Both PNG, quality.
function buildInputs(
  personUrl: string,
  garmentUrl: string,
  category: RenderCategory,
): Record<string, unknown> {
  if (isMaxModel) {
    return {
      model_image: personUrl,
      product_image: garmentUrl,
      resolution: RESOLUTION,
      generation_mode: "quality", // highest tier only — never fast/balanced
      output_format: "png", // lossless: chained passes don't compound artifacts
    };
  }
  return {
    model_image: personUrl,
    garment_image: garmentUrl,
    category: fashnCategory(category),
    mode: "quality", // highest tier only — never fast/balanced
    output_format: "png",
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class FashnHand implements Hand {
  async render(input: {
    person: ImageRef;
    garment: ImageRef;
    out: ImageRef;
    category: RenderCategory;
    quality: "max";
  }): Promise<RenderResult> {
    const key = process.env.FASHN_API_KEY;
    if (!key) {
      return { ok: false, reason: "provider_error", detail: "FASHN_API_KEY not set" };
    }

    const started = Date.now();

    const [personUrl, garmentUrl] = await Promise.all([
      signedUrl(input.person.path, SIGN_SECONDS),
      signedUrl(input.garment.path, SIGN_SECONDS),
    ]);
    if (!personUrl || !garmentUrl) {
      return { ok: false, reason: "rejected_input", detail: "could not sign input images" };
    }

    // Start the prediction.
    let id: string;
    try {
      const res = await fetch(RUN_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_name: MODEL,
          inputs: buildInputs(personUrl, garmentUrl, input.category),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          reason: "provider_error",
          detail: `run ${res.status}: ${body.slice(0, 200)}`,
        };
      }
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: unknown;
      };
      if (!json.id) {
        return {
          ok: false,
          reason: "provider_error",
          detail: `no prediction id (${JSON.stringify(json.error ?? json)})`,
        };
      }
      id = json.id;
    } catch (e) {
      return {
        ok: false,
        reason: "provider_error",
        detail: e instanceof Error ? e.message : "run request failed",
      };
    }

    // Poll until done.
    let outputUrl: string | null = null;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const res = await fetch(`${STATUS_URL}/${id}`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) continue;
        const s = (await res.json().catch(() => ({}))) as {
          status?: string;
          output?: string[];
          error?: unknown;
        };
        if (s.status === "completed") {
          outputUrl = s.output?.[0] ?? null;
          break;
        }
        if (s.status === "failed") {
          return {
            ok: false,
            reason: "provider_error",
            detail: `render failed: ${JSON.stringify(s.error ?? "")}`.slice(0, 200),
          };
        }
      } catch {
        // transient poll error — keep waiting until the deadline
      }
    }
    if (!outputUrl) {
      return { ok: false, reason: "timeout", detail: "render timed out" };
    }

    // Download the result and store it privately at `out`.
    let bytes: Buffer;
    let contentType = "image/png";
    try {
      const dl = await fetch(outputUrl);
      if (!dl.ok) throw new Error(`download ${dl.status}`);
      contentType = dl.headers.get("content-type") ?? contentType;
      bytes = Buffer.from(await dl.arrayBuffer());
    } catch (e) {
      return {
        ok: false,
        reason: "provider_error",
        detail: e instanceof Error ? e.message : "output download failed",
      };
    }

    const stored = await uploadToUserPhotos(input.out.path, bytes, contentType);
    if (!stored) {
      return { ok: false, reason: "provider_error", detail: "could not store render" };
    }

    return {
      ok: true,
      image: input.out,
      ms: Date.now() - started,
      costUsd: COST_ESTIMATE_USD,
    };
  }
}

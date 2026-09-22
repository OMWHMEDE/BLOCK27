import "server-only";
import sharp from "sharp";

// Server-side image work. Two jobs, both best-effort — a resize failure must
// never break the flow it sits in (a garment still uploads; an analysis still
// runs on the original bytes). sharp reads any common format and we always emit
// JPEG, so the output media type is known regardless of what came in.

// Wardrobe grid thumbnail. The grid paints 3-up tiles a few hundred px wide, so
// a 400px long edge at moderate quality is plenty and a fraction of the bytes.
const THUMB_MAX_EDGE = 400;
const THUMB_QUALITY = 70;

// Vision-call downscale. Anthropic vision down-samples large images anyway; above
// ~1568px on the long edge we'd pay upload time and image tokens for pixels the
// model discards. Keep enough detail to read fabric and cut. `withoutEnlargement`
// leaves an already-small garment photo untouched.
const VISION_MAX_EDGE = 1536;
const VISION_QUALITY = 80;

// A small JPEG thumbnail of the garment, or null if it couldn't be produced.
// Null is a valid outcome: the caller stores no thumb_path and the grid falls
// back to the full-size image for that garment.
export async function makeThumbnail(bytes: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(bytes)
      .rotate() // honor EXIF orientation before we strip metadata
      .resize({
        width: THUMB_MAX_EDGE,
        height: THUMB_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();
  } catch (e) {
    console.error(
      "[images] thumbnail failed",
      e instanceof Error ? e.message : "",
    );
    return null;
  }
}

// Downscale bytes for a vision call. Returns JPEG bytes plus their media type.
// On any failure it returns the ORIGINAL bytes as image/jpeg — exactly the
// behavior the analyze path had before this helper existed (it always passed
// image/jpeg), so a resize failure degrades to "send the original", never an
// error.
export async function downscaleForVision(
  bytes: Buffer,
): Promise<{ bytes: Buffer; mediaType: "image/jpeg" }> {
  try {
    const out = await sharp(bytes)
      .rotate()
      .resize({
        width: VISION_MAX_EDGE,
        height: VISION_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: VISION_QUALITY })
      .toBuffer();
    return { bytes: out, mediaType: "image/jpeg" };
  } catch (e) {
    console.error(
      "[images] vision downscale failed — sending original",
      e instanceof Error ? e.message : "",
    );
    return { bytes, mediaType: "image/jpeg" };
  }
}

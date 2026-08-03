import "server-only";
import { getHand, type ImageRef, type RenderCategory } from "@/lib/hand";
import {
  USER_PHOTOS_BUCKET,
  basePhotoPath,
  renderPath,
  renderTmpPath,
} from "@/lib/photos";
import { removeFromUserPhotos } from "@/lib/supabase/storage";

export type RenderLayer = {
  garmentPath: string;
  category: RenderCategory;
  // Human label (the garment's descriptor) so a failure can name the exact piece
  // that couldn't be placed — "couldn't place the steel diver's watch" — rather
  // than a bare category. Never silently drop a layer; say which one gave out.
  label?: string;
};

// The render doctrine caps retries at two. A transient provider error or timeout
// is retried; a rejected input won't change on a retry, so it fails fast.
const MAX_ATTEMPTS = 3; // one try + two retries

// Chain the hand over an outfit's layers, base photo first. The brain has
// already decided which garments and in what order; this only executes.
//
//   base + layer0 -> r0
//   r0   + layer1 -> r1
//   ...            -> {user_id}/renders/{outfit_id}.jpg
export async function renderOutfit(
  userId: string,
  outfitId: string,
  layers: RenderLayer[],
): Promise<{ ok: true; path: string } | { ok: false; detail: string }> {
  const hand = getHand();
  const finalPath = renderPath(userId, outfitId);
  const tmp: string[] = [];

  let person: ImageRef = {
    bucket: USER_PHOTOS_BUCKET,
    path: basePhotoPath(userId),
  };

  for (let i = 0; i < layers.length; i++) {
    const isLast = i === layers.length - 1;
    const outPath = isLast ? finalPath : renderTmpPath(userId, outfitId, i);
    if (!isLast) tmp.push(outPath);

    // Try the layer, retrying only transient failures, capped at two retries.
    let result = await hand.render({
      person,
      garment: { bucket: USER_PHOTOS_BUCKET, path: layers[i].garmentPath },
      out: { bucket: USER_PHOTOS_BUCKET, path: outPath },
      category: layers[i].category,
      quality: "max",
    });
    for (
      let attempt = 2;
      !result.ok &&
      attempt <= MAX_ATTEMPTS &&
      (result.reason === "provider_error" || result.reason === "timeout");
      attempt++
    ) {
      console.warn(
        `[render] layer ${i} (${layers[i].category}) ${result.reason}, retry ${attempt - 1}/${MAX_ATTEMPTS - 1}:`,
        result.detail,
      );
      result = await hand.render({
        person,
        garment: { bucket: USER_PHOTOS_BUCKET, path: layers[i].garmentPath },
        out: { bucket: USER_PHOTOS_BUCKET, path: outPath },
        category: layers[i].category,
        quality: "max",
      });
    }

    if (!result.ok) {
      await removeFromUserPhotos(tmp).catch(() => {});
      // Name the piece that gave out, so the caller can be honest about it
      // instead of showing a broken or silently-missing layer.
      const piece = layers[i].label ?? layers[i].category;
      return { ok: false, detail: `couldn't place ${piece} — ${result.detail}` };
    }
    person = result.image;
  }

  await removeFromUserPhotos(tmp).catch(() => {});
  return { ok: true, path: finalPath };
}

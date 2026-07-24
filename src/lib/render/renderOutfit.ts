import "server-only";
import { getHand, type ImageRef, type RenderCategory } from "@/lib/hand";
import {
  USER_PHOTOS_BUCKET,
  basePhotoPath,
  renderPath,
  renderTmpPath,
} from "@/lib/photos";
import { removeFromUserPhotos } from "@/lib/supabase/storage";

export type RenderLayer = { garmentPath: string; category: RenderCategory };

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

    const result = await hand.render({
      person,
      garment: { bucket: USER_PHOTOS_BUCKET, path: layers[i].garmentPath },
      out: { bucket: USER_PHOTOS_BUCKET, path: outPath },
      category: layers[i].category,
      quality: "max",
    });

    if (!result.ok) {
      await removeFromUserPhotos(tmp).catch(() => {});
      return { ok: false, detail: result.detail };
    }
    person = result.image;
  }

  await removeFromUserPhotos(tmp).catch(() => {});
  return { ok: true, path: finalPath };
}

// Per-outfit validation for the streaming composer. Pure (no I/O), so it's unit
// tested directly. Returns the cleaned item ids to store, or null to reject the
// outfit (too few real pieces, or a repeat of one already produced this run).

export type OutfitShape = { item_ids: string[]; angle: string };

export function acceptOutfit(
  outfit: OutfitShape,
  validIds: Set<string>,
  prior: OutfitShape[],
): string[] | null {
  // Real pieces only, de-duplicated, at least two.
  const uniqueIds = [...new Set(outfit.item_ids.filter((id) => validIds.has(id)))];
  if (uniqueIds.length < 2) return null;

  // No repeat: neither the same angle nor the same set as a prior outfit.
  const angle = outfit.angle.trim().toLowerCase();
  const dupAngle =
    angle.length > 0 && prior.some((p) => p.angle.trim().toLowerCase() === angle);
  const dupSet = prior.some((p) => sameSet(p.item_ids, uniqueIds));
  if (dupAngle || dupSet) return null;

  return uniqueIds;
}

export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

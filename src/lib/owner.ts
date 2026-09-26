import "server-only";

// Who may see the private owner dashboard. The owner is OWNER_UID when set, plus
// anyone in PAID_OVERRIDE_UIDS (the testing allowlist — the founder's own
// accounts). Parsed fresh each call (env is read at request time on the server).
// Everyone else gets a 404 from the page, so it never announces itself.
function ownerUids(): Set<string> {
  const set = new Set<string>();
  const owner = process.env.OWNER_UID?.trim();
  if (owner) set.add(owner);
  for (const id of (process.env.PAID_OVERRIDE_UIDS ?? "").split(",")) {
    const t = id.trim();
    if (t) set.add(t);
  }
  return set;
}

export function isOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ownerUids().has(userId);
}

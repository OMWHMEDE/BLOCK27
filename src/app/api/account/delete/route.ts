import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_PHOTOS_BUCKET } from "@/lib/photos";

// Account deletion. A genuine purge — we hold full-body photos, so this leaves
// nothing behind. SERVER ONLY, run with the service-role (secret) key; never the
// client. Order: every storage object, then the auth user (its ON DELETE CASCADE
// FKs remove all DB rows — wardrobe, outfits, renders, recommendations, profile).
export const runtime = "nodejs";
export const maxDuration = 60;

// Storage.list is not recursive; walk the user's folder tree and collect every
// object path. Supabase returns sub-folders as entries with a null id.
async function listAllPaths(
  admin: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await admin.storage
    .from(USER_PHOTOS_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error || !data) return out;

  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id == null) {
      out.push(...(await listAllPaths(admin, path)));
    } else {
      out.push(path);
    }
  }
  return out;
}

export async function POST() {
  // Identify the caller with their own session; never take an id from the body.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const uid = user.id;

  const admin = createAdminClient();

  // a. Every storage object under the user's folder, removed in batches.
  try {
    const paths = await listAllPaths(admin, uid);
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error } = await admin.storage
        .from(USER_PHOTOS_BUCKET)
        .remove(batch);
      if (error) throw new Error(`storage: ${error.message}`);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : "storage purge failed";
    console.error("[account/delete] storage", uid, detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  // b + c. Delete the auth user — cascades every DB row (all FKs are ON DELETE
  // CASCADE, confirmed in the schema).
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    console.error("[account/delete] auth", uid, delErr.message);
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

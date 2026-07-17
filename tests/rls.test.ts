import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.local so this can run against a real project without extra flags.
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Only meaningful against a live project with the migration applied. When
// pointed at placeholders it SKIPS rather than passing a hollow assertion — a
// green run here means the isolation was actually exercised.
const CONFIGURED =
  !!url &&
  !!anonKey &&
  !!serviceKey &&
  !url.includes("placeholder") &&
  !serviceKey.includes("placeholder");

const PASSWORD = "test-password-123!";

function anonClient(): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe.skipIf(!CONFIGURED)("RLS: a user cannot read another user's data", () => {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const emailA = `rls-a-${Date.now()}@example.com`;
  const emailB = `rls-b-${Date.now()}@example.com`;
  let userAId = "";
  let userBId = "";
  let garmentAId = "";

  beforeAll(async () => {
    const a = await admin.auth.admin.createUser({
      email: emailA,
      password: PASSWORD,
      email_confirm: true,
    });
    const b = await admin.auth.admin.createUser({
      email: emailB,
      password: PASSWORD,
      email_confirm: true,
    });
    userAId = a.data.user!.id;
    userBId = b.data.user!.id;

    // User A inserts a garment as themselves (anon key + their session → RLS).
    const clientA = anonClient();
    await clientA.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data, error } = await clientA
      .from("garments")
      .insert({ user_id: userAId, photo_path: `${userAId}/shirt.jpg` })
      .select()
      .single();
    if (error) throw error;
    garmentAId = data.id;
  });

  afterAll(async () => {
    // Real deletion. Cascade removes the garment too.
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("A can read A's own garment", async () => {
    const clientA = anonClient();
    await clientA.auth.signInWithPassword({ email: emailA, password: PASSWORD });
    const { data } = await clientA.from("garments").select("id");
    expect(data?.map((r) => r.id)).toContain(garmentAId);
  });

  it("B cannot see A's garments in a list query", async () => {
    const clientB = anonClient();
    await clientB.auth.signInWithPassword({ email: emailB, password: PASSWORD });
    const { data } = await clientB.from("garments").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("B cannot read A's garment by id", async () => {
    const clientB = anonClient();
    await clientB.auth.signInWithPassword({ email: emailB, password: PASSWORD });
    const { data } = await clientB
      .from("garments")
      .select("id")
      .eq("id", garmentAId);
    expect(data ?? []).toHaveLength(0);
  });

  it("B cannot update A's garment", async () => {
    const clientB = anonClient();
    await clientB.auth.signInWithPassword({ email: emailB, password: PASSWORD });
    const { data } = await clientB
      .from("garments")
      .update({ reject_reason: "hijacked" })
      .eq("id", garmentAId)
      .select();
    // RLS makes the row invisible, so the update matches nothing.
    expect(data ?? []).toHaveLength(0);
  });
});

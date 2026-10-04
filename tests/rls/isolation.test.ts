/**
 * Proves one user can never read or change another user's rows.
 *
 * Runs against LOCAL Supabase only (it creates and deletes test users):
 *   npx supabase start
 *   npx supabase status -o env   # copy API_URL, ANON_KEY and SERVICE_ROLE_KEY below
 *   SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... SUPABASE_TEST_SERVICE_ROLE_KEY=... npm run test:rls
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.SUPABASE_TEST_URL ?? "";
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url.replace(/\/$/, ""));
const ready = isLocal && anonKey && serviceKey;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

describe.skipIf(!ready)("row-level security", () => {
  const admin = ready ? createClient(url, serviceKey, noSession) : (null as never);
  const password = "test-password-123";
  const users: { id: string; client: SupabaseClient }[] = [];
  let aliceProject = "";
  let aliceEntry = "";
  let aliceTag = "";

  async function makeUser(label: string) {
    const email = `rls-${label}-${crypto.randomUUID()}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const client = createClient(url, anonKey, noSession);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    const user = { id: data.user.id, client };
    users.push(user);
    return user;
  }

  beforeAll(async () => {
    const alice = await makeUser("alice");
    await makeUser("bob");

    const project = await alice.client.from("projects").insert({ name: "Alice project" }).select().single();
    if (project.error) throw project.error;
    aliceProject = project.data.id;

    const entry = await alice.client
      .from("time_entries")
      .insert({ description: "Alice work", start_at: "2026-10-01T09:00:00Z", stop_at: "2026-10-01T10:00:00Z", project_id: aliceProject })
      .select()
      .single();
    if (entry.error) throw entry.error;
    aliceEntry = entry.data.id;

    const tag = await alice.client.from("tags").insert({ name: "deep work" }).select().single();
    if (tag.error) throw tag.error;
    aliceTag = tag.data.id;
  });

  afterAll(async () => {
    if (!ready) return;
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
  });

  const bob = () => users[1].client;

  it.each(["profiles", "clients", "projects", "time_entries", "tags", "time_entry_tags"])(
    "Bob reads none of Alice's %s",
    async (table) => {
      const { data, error } = await bob().from(table).select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    },
  );

  it("Bob cannot update or delete Alice's entry", async () => {
    await bob().from("time_entries").update({ description: "hacked" }).eq("id", aliceEntry);
    await bob().from("time_entries").delete().eq("id", aliceEntry);

    const { data } = await users[0].client.from("time_entries").select("description").eq("id", aliceEntry).single();
    expect(data?.description).toBe("Alice work");
  });

  it("Bob cannot insert a row owned by Alice", async () => {
    const { error } = await bob().from("projects").insert({ name: "Planted", user_id: users[0].id });
    expect(error).not.toBeNull();
  });

  it("Bob cannot link his entry to Alice's project", async () => {
    const { error } = await bob()
      .from("time_entries")
      .insert({ start_at: "2026-10-01T09:00:00Z", stop_at: "2026-10-01T10:00:00Z", project_id: aliceProject });
    expect(error).not.toBeNull();
  });

  it("Bob cannot tag his entry with Alice's tag", async () => {
    const entry = await bob()
      .from("time_entries")
      .insert({ start_at: "2026-10-02T09:00:00Z", stop_at: "2026-10-02T10:00:00Z" })
      .select()
      .single();
    expect(entry.error).toBeNull();

    const { error } = await bob().from("time_entry_tags").insert({ time_entry_id: entry.data!.id, tag_id: aliceTag });
    expect(error).not.toBeNull();
  });

  it("allows only one running timer per user", async () => {
    const first = await bob().from("time_entries").insert({ start_at: new Date().toISOString() });
    expect(first.error).toBeNull();
    const second = await bob().from("time_entries").insert({ start_at: new Date().toISOString() });
    expect(second.error).not.toBeNull();
  });

  it("signed-out visitors see nothing", async () => {
    const anon = createClient(url, anonKey, noSession);
    const { data } = await anon.from("time_entries").select("*");
    expect(data ?? []).toEqual([]);
  });
});

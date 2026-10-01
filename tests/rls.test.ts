// Row level security: user B cannot read or change user A's profile, kits, leads or events.
// Needs the local stack (`pnpm stack up`). `pnpm test:rls` fails if it is not running; `pnpm test` skips these.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localEnv, stackIsUp } from "./helpers/stack";

const up = await stackIsUp();
if (!up && process.env.RLS_REQUIRED) throw new Error("RLS_REQUIRED is set but the local stack is not running. Run `pnpm stack up`.");

describe.skipIf(!up)("row level security", () => {
  const env = localEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321"; // unused when the stack is down: the suite is skipped
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY ?? "unset", opts);
  const stamp = Date.now();
  const emails = { a: `rls-a-${stamp}@example.com`, b: `rls-b-${stamp}@example.com` };
  const password = "correct horse battery staple";
  let a: SupabaseClient, b: SupabaseClient, anon: SupabaseClient;
  let aId = "", bId = "", kitId = "", leadId = "";

  async function signedIn(email: string) {
    const c = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "unset", opts);
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { c, id: data.user.id };
  }

  beforeAll(async () => {
    for (const email of Object.values(emails)) {
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw error;
    }
    ({ c: a, id: aId } = await signedIn(emails.a));
    ({ c: b, id: bId } = await signedIn(emails.b));
    anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "unset", opts);

    const kit = await a.from("kits").insert({ category: "Fencing & gates", device: "desktop", state: "TX", city: "Austin" }).select().single();
    expect(kit.error).toBeNull();
    kitId = kit.data!.id;
    const lead = await a.from("leads").insert({ business_name: "Acme Fence", kit_id: kitId, check_no_real_website: true }).select().single();
    expect(lead.error).toBeNull();
    leadId = lead.data!.id;
    const ev = await a.from("lead_events").insert({ lead_id: leadId, kind: "touch", channel: "instagram_dm", note: "Day 0" });
    expect(ev.error).toBeNull();
  });

  afterAll(async () => {
    for (const id of [aId, bId]) if (id) await admin.auth.admin.deleteUser(id);
  });

  it("each account gets a profile row", async () => {
    const { data } = await a.from("profiles").select("id");
    expect(data).toEqual([{ id: aId }]);
  });

  it("A can read their own kit, lead and events (stage log included)", async () => {
    expect((await a.from("kits").select("id")).data).toHaveLength(1);
    expect((await a.from("leads").select("id")).data).toHaveLength(1);
    const events = (await a.from("lead_events").select("kind,to_stage")).data!;
    expect(events).toContainEqual({ kind: "stage_change", to_stage: "sourced" });
    expect(events).toContainEqual({ kind: "touch", to_stage: null });
  });

  it("B cannot read A's kits", async () => {
    expect((await b.from("kits").select("*")).data).toEqual([]);
    expect((await b.from("kits").select("*").eq("id", kitId)).data).toEqual([]);
  });

  it("B cannot read A's leads or events", async () => {
    expect((await b.from("leads").select("*")).data).toEqual([]);
    expect((await b.from("leads").select("*").eq("id", leadId)).data).toEqual([]);
    expect((await b.from("lead_events").select("*")).data).toEqual([]);
  });

  it("B cannot read A's profile", async () => {
    const { data } = await b.from("profiles").select("id");
    expect(data).toEqual([{ id: bId }]);
    expect((await b.from("profiles").select("*").eq("id", aId)).data).toEqual([]);
  });

  it("B cannot change or delete A's rows", async () => {
    await b.from("kits").update({ city: "Hacked" }).eq("id", kitId);
    await b.from("leads").update({ business_name: "Hacked", stage: "won" }).eq("id", leadId);
    await b.from("profiles").update({ name: "Hacked" }).eq("id", aId);
    await b.from("kits").delete().eq("id", kitId);
    await b.from("leads").delete().eq("id", leadId);
    const kit = (await a.from("kits").select("city").eq("id", kitId).single()).data;
    const lead = (await a.from("leads").select("business_name,stage").eq("id", leadId).single()).data;
    expect(kit).toEqual({ city: "Austin" });
    expect(lead).toEqual({ business_name: "Acme Fence", stage: "sourced" });
    expect((await a.from("profiles").select("name").single()).data).toEqual({ name: "" });
  });

  it("B cannot write rows in A's name", async () => {
    const asA = await b.from("kits").insert({ owner_id: aId, category: "x", device: "desktop", state: "TX", city: "Austin" });
    expect(asA.error).not.toBeNull();
    const toKit = await b.from("leads").insert({ business_name: "Mine", kit_id: kitId });
    expect(toKit.error).not.toBeNull(); // cannot attach a lead to A's kit
    const event = await b.from("lead_events").insert({ lead_id: leadId, kind: "touch" });
    expect(event.error).not.toBeNull(); // cannot log an event on A's lead
  });

  it("B cannot move a lead of their own onto A's kit", async () => {
    const own = await b.from("leads").insert({ business_name: "B's lead" }).select().single();
    expect(own.error).toBeNull();
    const moved = await b.from("leads").update({ kit_id: kitId }).eq("id", own.data!.id);
    expect(moved.error).not.toBeNull();
  });

  it("signed-out visitors can read nothing", async () => {
    for (const table of ["profiles", "kits", "leads", "lead_events"] as const) {
      const r = await anon.from(table).select("*");
      expect(r.error !== null || (r.data ?? []).length === 0).toBe(true);
    }
    expect((await anon.from("kits").insert({ category: "x", device: "desktop", state: "TX", city: "y" })).error).not.toBeNull();
  });

  it("score and tier are computed by the database", async () => {
    const lead = (await a.from("leads").select("score,tier").eq("id", leadId).single()).data;
    expect(lead).toEqual({ score: 1, tier: "skip" });
    await a.from("leads").update({
      check_owner_run: true, check_active_30_days: true, check_older_3_months: true, check_in_radius: true,
      check_job_value_fits: true, check_reviews_5_to_200: true,
    }).eq("id", leadId);
    expect((await a.from("leads").select("score,tier").eq("id", leadId).single()).data).toEqual({ score: 7, tier: "warm" });
    expect((await a.from("leads").update({ score: 10 } as never).eq("id", leadId)).error).not.toBeNull();
  });

  it("moving a lead's stage writes an event", async () => {
    await a.from("leads").update({ stage: "contacted" }).eq("id", leadId);
    const { data } = await a.from("lead_events").select("from_stage,to_stage").eq("kind", "stage_change").order("created_at");
    expect(data).toContainEqual({ from_stage: "sourced", to_stage: "contacted" });
  });
});

// Live ratios computed from the real lead_events the database trigger writes. Needs the local stack.
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatRatio, liveRatios } from "@/lib/leads/ratios";
import { localEnv, stackIsUp } from "./helpers/stack";

const up = await stackIsUp();

describe.skipIf(!up)("live ratios from lead_events", () => {
  const env = localEnv();
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321", env.SUPABASE_SERVICE_ROLE_KEY ?? "unset", opts);
  const user = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321", env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "unset", opts);
  let userId = "";

  beforeAll(async () => {
    const email = `ratios-${Date.now()}@example.com`;
    const created = await admin.auth.admin.createUser({ email, password: "correct horse battery", email_confirm: true });
    userId = created.data.user!.id;
    const { error } = await user.auth.signInWithPassword({ email, password: "correct horse battery" });
    if (error) throw error;
  });
  afterAll(async () => { if (userId) await admin.auth.admin.deleteUser(userId); });

  it("shows 'not enough data' below 100 leads, then real ratios at 100", async () => {
    const ins = await user.from("leads").insert(Array.from({ length: 100 }, (_, i) => ({ business_name: `Lead ${i}` }))).select("id");
    expect(ins.error).toBeNull();
    const ids = ins.data!.map((r) => r.id);

    // 50 contacted, 5 of those replied, 2 of those booked a call
    await user.from("leads").update({ stage: "contacted" }).in("id", ids.slice(0, 50));
    await user.from("leads").update({ stage: "replied" }).in("id", ids.slice(0, 5));
    await user.from("leads").update({ stage: "call_booked" }).in("id", ids.slice(0, 2));

    const events = (await user.from("lead_events").select("lead_id,to_stage").eq("kind", "stage_change").limit(1000)).data!;
    const few = liveRatios(events, 99);
    expect(formatRatio(few.contactedToReplied)).toBe("Not enough data");

    const live = liveRatios(events, 100);
    expect(formatRatio(live.contactedToReplied)).toBe("10%"); // 5 of 50
    expect(formatRatio(live.repliedToCall)).toBe("40%"); // 2 of 5
    expect(formatRatio(live.callToProposal)).toBe("0%"); // 0 of the 2 who booked a call
    expect(formatRatio(live.proposalToWon)).toBe("No leads at this stage yet");
  });
});

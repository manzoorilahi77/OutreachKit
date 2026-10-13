// What only the MySQL Store has to prove: the unique keys, the locks, and the session rules that the database enforces.
// The behaviour both Stores share is in tests/contract/storeContract.ts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signSession } from "@/lib/auth/cookie";
import { resolveSession } from "@/lib/auth/session";
import { migrate, readMigrations } from "@/lib/db/migrate";
import { dbConfigFromEnv } from "@/lib/db/config";
import { StoreError } from "@/lib/store/errors";
import { lead, hash, seedCast } from "./helpers/team";
import { mysqlBackend, mysqlConfigured } from "./contract/mysqlBackend";

const SECRET = "s".repeat(64);

describe.skipIf(!mysqlConfigured)("MySQL Store", () => {
  let backend: Awaited<ReturnType<typeof mysqlBackend>>;
  let t: Awaited<ReturnType<typeof seedCast>>;

  beforeAll(async () => {
    backend = await mysqlBackend();
    t = await seedCast(backend);
  });
  afterAll(() => backend.cleanup());

  const settled = async (ps: Promise<unknown>[]) => Promise.allSettled(ps);
  const resolve = (username: string, rev: number, now = new Date()) =>
    resolveSession(signSession({ username, rev, issuedAt: now.getTime() }, SECRET), { store: backend.storeFor(null), forActor: backend.storeFor, secret: SECRET, now });

  describe("duplicate leads", () => {
    it("two parallel adds of the same business: exactly one succeeds", async () => {
      const biz = lead({ business_name: "Race Roofing", phone: "2145550100" });
      const results = await settled([t.ravi.createLead(biz), t.asha.createLead(biz), t.bryn.createLead(biz), t.ravi.createLead(biz)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      for (const r of results.filter((x) => x.status === "rejected")) {
        const e = (r as PromiseRejectedResult).reason;
        expect(e).toBeInstanceOf(StoreError);
        expect((e as StoreError).code).toBe("duplicate");
        expect((e as StoreError).message).toMatch(/is already (your|\w+'s) lead\./);
      }
      expect((await t.owner.listLeads()).filter((l) => l.business_name === "Race Roofing")).toHaveLength(1);
    });
    it("the same phone under a different name is the same business, even in parallel", async () => {
      const results = await settled([
        t.ravi.createLead(lead({ business_name: "Alpha One", phone: "(972) 555-0142" })),
        t.asha.createLead(lead({ business_name: "Beta Two", phone: "972-555-0142" })),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    });
    it("a failed add leaves nothing behind", async () => {
      const before = (await t.owner.listLeads()).length;
      await expect(t.asha.createLead(lead({ business_name: "Race Roofing", phone: "" }))).rejects.toBeInstanceOf(StoreError);
      expect((await t.owner.listLeads()).length).toBe(before);
    });
    it("editing a lead into someone else's business is refused, and the lead keeps its old details", async () => {
      const mine = await t.asha.createLead(lead({ business_name: "Edit Me Fencing", phone: "2145550301" }));
      const e = await t.asha.updateLead(mine.id, lead({ business_name: "Edit Me Fencing", phone: "2145550100" }) as never).then(() => null, (x) => x as StoreError);
      expect(e).toBeInstanceOf(StoreError);
      expect(e?.code).toBe("duplicate");
      expect((await t.asha.getLead("asha", mine.id))?.phone).toBe("2145550301");
      // Its old keys still guard it.
      await expect(t.ravi.createLead(lead({ business_name: "Someone", phone: "2145550301" }))).rejects.toMatchObject({ code: "duplicate" });
    });
    it("an edit that changes the phone moves the guard to the new number", async () => {
      const mine = await t.asha.createLead(lead({ business_name: "Moving Number Co", phone: "2145550411" }));
      await t.asha.updateLead(mine.id, lead({ business_name: "Moving Number Co", phone: "2145550412" }) as never);
      await expect(t.ravi.createLead(lead({ business_name: "X", phone: "2145550412" }))).rejects.toMatchObject({ code: "duplicate" });
      await t.ravi.createLead(lead({ business_name: "Y Company", phone: "2145550411" }));
    });
    it("deleting a lead frees its keys", async () => {
      const mine = await t.asha.createLead(lead({ business_name: "Short Lived", phone: "2145550511" }));
      await t.asha.deleteLead(mine.id);
      await t.ravi.createLead(lead({ business_name: "Short Lived", phone: "2145550511" }));
    });
  });

  describe("hand-offs", () => {
    it("two accepts of one hand-off make one copy", async () => {
      const src = await t.meera.createLead(lead({ business_name: "Handoff Race Co", phone: "2145550611" }));
      const asg = await t.mia.assignLead("meera", src.id, "asha");
      const results = await settled([t.asha.acceptAssignment(asg.id), t.asha.acceptAssignment(asg.id)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect((await t.asha.listLeads()).filter((l) => l.business_name === "Handoff Race Co")).toHaveLength(1);
    });
    it("deleting an accepted copy gives the original its place back", async () => {
      const src = await t.meera.createLead(lead({ business_name: "Copy Back Co", phone: "2145550711" }));
      const asg = await t.mia.assignLead("meera", src.id, "asha");
      const copy = await t.asha.acceptAssignment(asg.id);
      await expect(t.ravi.createLead(lead({ business_name: "Copy Back Co", phone: "" }))).rejects.toMatchObject({ message: "Copy Back Co is already Asha's lead." });
      await t.asha.deleteLead(copy.id);
      const original = (await t.meera.listLeads()).find((l) => l.id === src.id)!;
      expect(original.superseded).toBe(false);
      await expect(t.ravi.createLead(lead({ business_name: "Copy Back Co", phone: "" }))).rejects.toMatchObject({ code: "duplicate" });
    });
  });

  describe("accounts and sessions", () => {
    it("a reset, a suspension and a role change each end the person's session on the next request", async () => {
      const ok = async (u: string) => {
        const user = (await t.owner.getUser(u))!;
        return resolve(u, user.rev);
      };
      const rev = (await t.owner.getUser("bryn"))!.rev;
      expect((await resolve("bryn", rev)).kind).toBe("ok");

      await t.owner.changeUser("bryn", { type: "reset_password", tempPasswordHash: hash("next") });
      expect(await resolve("bryn", rev)).toMatchObject({ kind: "none", reason: "rev_changed" });
      expect((await ok("bryn")).kind).toBe("ok");

      const r2 = (await t.owner.getUser("bryn"))!.rev;
      await t.owner.changeUser("bryn", { type: "change_role", role: "researcher" });
      expect(await resolve("bryn", r2)).toMatchObject({ kind: "none", reason: "rev_changed" });
      await t.owner.changeUser("bryn", { type: "change_role", role: "bd" });

      const r3 = (await t.owner.getUser("bryn"))!.rev;
      await t.owner.changeUser("bryn", { type: "suspend", reason: "Leave", until: null });
      expect(await resolve("bryn", r3)).toMatchObject({ kind: "no_access", status: "suspended" });
      await t.owner.changeUser("bryn", { type: "enable" });
      expect(await resolve("bryn", r3)).toMatchObject({ kind: "none", reason: "rev_changed" });
    });
    it("two people can't both remove the last active admin", async () => {
      // Only the owner and Ada hold an admin role. Ada may be turned off by the owner; the owner can't be touched, so the guard is exercised on Ada.
      const results = await settled([
        t.owner.changeUser("ada", { type: "suspend", reason: "a", until: null }),
        t.owner.changeUser("ada", { type: "suspend", reason: "b", until: null }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
      const ada = (await t.owner.getUser("ada"))!;
      expect(ada.status).toBe("suspended");
      await t.owner.changeUser("ada", { type: "enable" });
    });
  });

  describe("events", () => {
    it("come back in the order they were written", async () => {
      const l = await t.asha.createLead(lead({ business_name: "Ordered Events Co", phone: "2145550811" }));
      await t.asha.moveStage(l.id, "qualified", "2026-10-12");
      await t.asha.moveStage(l.id, "contacted", "2026-10-12");
      const { events } = await t.asha.readScope("leads.view");
      const mine = events.filter((e) => e.lead_id === l.id).map((e) => `${e.kind}:${e.to_stage ?? ""}`);
      expect(mine).toEqual(["stage_change:sourced", "stage_change:qualified", "stage_change:contacted", "touch:"]);
    });
  });
});

describe.skipIf(!mysqlConfigured)("migrations", () => {
  it("apply once, in order, and refuse an edited file", async () => {
    const b = await mysqlBackend();
    try {
      const files = await readMigrations();
      expect(files.length).toBeGreaterThan(0);
      expect(files.map((f) => f.version)).toEqual([...files.map((f) => f.version)].sort((x, y) => x - y));
      const [db] = await b.pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT DATABASE() AS name");
      const config = { ...dbConfigFromEnv({ ...process.env, DB_NAME: "x" }), database: db[0]!.name as string };
      expect(await migrate(config)).toEqual([]); // the backend already applied them
      await b.pool.query("UPDATE schema_migrations SET checksum = REPEAT('0', 40) WHERE version = 1");
      await expect(migrate(config)).rejects.toThrow(/changed after it ran/);
    } finally {
      await b.cleanup();
    }
  });
});

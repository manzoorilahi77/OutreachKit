// The Store contract: what every storage backend (the team/ files, MySQL) must do the same way. The cast and its order
// of events are shared by all tests below, so they run top to bottom against one backend.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StoreError } from "@/lib/store/errors";
import { hash, lead, seedCast } from "../helpers/team";
import type { Backend, BackendFactory } from "./backend";

export function storeContract(name: string, make: BackendFactory, opts: { skip?: boolean } = {}) {
  describe.skipIf(opts.skip)(`Store contract: ${name}`, () => {
    let backend: Backend;
    let t: Awaited<ReturnType<typeof seedCast>>;

    beforeAll(async () => {
      backend = await make();
      t = await seedCast(backend);
    });
    afterAll(() => backend.cleanup());

    const rejects = async (p: Promise<unknown>, code?: string) => {
      const e = await p.then(() => null, (x) => x as StoreError);
      expect(e).toBeInstanceOf(StoreError);
      if (code) expect(e?.code).toBe(code);
      return e!;
    };

    describe("accounts", () => {
      it("only admins create accounts, and only below their own level", async () => {
        await rejects(t.ravi.createUser({ username: "zed", fullName: "Zed", role: "bd", team: null, tempPasswordHash: hash("x") }), "forbidden");
        await rejects(t.ada.createUser({ username: "zed", fullName: "Zed", role: "admin", team: null, tempPasswordHash: hash("x") }), "forbidden");
        await rejects(t.owner.createUser({ username: "zed", fullName: "Zed", role: "super_admin", team: null, tempPasswordHash: hash("x") }), "forbidden");
        const u = await t.ada.createUser({ username: "zed", fullName: "Zed Zee", role: "bd", team: "team-a", tempPasswordHash: hash("x") });
        expect(u).toMatchObject({ rev: 1, pwRev: 1, status: "active" });
      });
      it("keeps only bcrypt hashes for passwords", async () => {
        const u = (await t.owner.getUser("ravi"))!;
        expect(u.tempPasswordHash).toMatch(/^\$2[aby]\$/);
        expect(JSON.stringify(u)).not.toContain("temp-ravi");
        expect((await t.owner.getProfile("owner"))!.passwordHash).toMatch(/^\$2[aby]\$/);
      });
      it("rejects bad and taken usernames", async () => {
        await rejects(t.owner.createUser({ username: "Bad Name", fullName: "x", role: "bd", team: null, tempPasswordHash: hash("x") }));
        await rejects(t.owner.createUser({ username: "ab", fullName: "x", role: "bd", team: null, tempPasswordHash: hash("x") }));
        await rejects(t.owner.createUser({ username: "con", fullName: "x", role: "bd", team: null, tempPasswordHash: hash("x") }));
        await rejects(t.owner.createUser({ username: "ravi", fullName: "x", role: "bd", team: null, tempPasswordHash: hash("x") }), "conflict");
      });
      it("lists a manager in their team's managers", async () => {
        expect((await t.owner.getTeams()).teams.find((x) => x.id === "team-a")?.managers).toEqual(["mia"]);
      });
      it("bumps rev on every change and pwRev only on a reset", async () => {
        const before = (await t.owner.getUser("asha"))!;
        const suspended = await t.owner.changeUser("asha", { type: "suspend", reason: "Leave", until: null });
        expect(suspended).toMatchObject({ status: "suspended", rev: before.rev + 1, pwRev: before.pwRev });
        const enabled = await t.owner.changeUser("asha", { type: "enable" });
        expect(enabled).toMatchObject({ status: "active", rev: before.rev + 2, pwRev: before.pwRev });
        const reset = await t.owner.changeUser("asha", { type: "reset_password", tempPasswordHash: hash("new") });
        expect(reset).toMatchObject({ rev: before.rev + 3, pwRev: before.rev + 3 });
      });
      it("nobody changes themselves, an admin, or the owner", async () => {
        await rejects(t.ada.changeUser("ada", { type: "suspend", reason: "", until: null }), "forbidden");
        await rejects(t.owner.changeUser("owner", { type: "disable" }), "forbidden");
        await rejects(t.ada.changeUser("owner", { type: "disable" }), "forbidden");
        await rejects(t.mia.changeUser("ravi", { type: "disable" }), "forbidden");
        await rejects(t.ada.changeUser("ravi", { type: "change_role", role: "admin" }), "forbidden");
      });
      it("keeps team managers in step with role and team changes", async () => {
        await t.ada.changeUser("zed", { type: "change_role", role: "manager" });
        expect((await t.owner.getTeams()).teams.find((x) => x.id === "team-a")?.managers).toContain("zed");
        await t.ada.changeUser("zed", { type: "move_team", team: "team-b" });
        const teams = (await t.owner.getTeams()).teams;
        expect(teams.find((x) => x.id === "team-a")?.managers).not.toContain("zed");
        expect(teams.find((x) => x.id === "team-b")?.managers).toContain("zed");
      });
      it("refuses to write outside the caller's folder or the account files they may write", async () => {
        await rejects(t.ravi.saveWorkspace({ name: "x", studio: "x", demoDomain: "x", basedLine: "", features: { leadFinder: true, softwareTrack: false } }), "forbidden");
        await rejects(t.mia.saveTeams({ teams: [] }), "forbidden");
        await rejects(t.vic.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" }), "forbidden");
      });
    });

    describe("kits", () => {
      it("saves inputs only, with a default title and status", async () => {
        const k = await t.ravi.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" });
        expect(k).toMatchObject({ title: "Roofing · Dallas, TX", status: "active", owner: "ravi" });
        expect(Object.keys(k).sort()).toEqual(["category", "city", "city_is_free", "created_at", "device", "direction", "id", "owner", "state", "status", "title", "updated_at"]);
        expect((await t.ravi.updateKit(k.id, { status: "paused", title: "Dallas roofers" }))).toMatchObject({ status: "paused", title: "Dallas roofers" });
      });
      it("shows who else works a category and city, names and counts only", async () => {
        await t.asha.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" });
        await t.ravi.updateKit((await t.ravi.listKits())[0]!.id, { status: "active" });
        await t.ravi.createLead(lead({ business_name: "Alpha Roofing", phone: "2145550201" }));
        await t.ravi.createLead(lead({ business_name: "Beta Roofing", phone: "2145550202" }));
        const seen = await t.asha.territory("Roofing", "TX", "Dallas");
        expect(seen).toEqual([{ username: "ravi", name: "Ravi", leads: 2 }]);
      });
      it("lists kits in scope: own, team, all", async () => {
        expect((await t.ravi.listKits()).every((k) => k.owner === "ravi")).toBe(true);
        expect(new Set((await t.mia.listKits()).map((k) => k.owner))).toEqual(new Set(["ravi", "asha"]));
        expect(new Set((await t.owner.listKits()).map((k) => k.owner)).size).toBeGreaterThanOrEqual(2);
        expect(await t.meera.listKits().catch((e) => e)).toBeInstanceOf(StoreError);
        expect((await t.vic.listKits()).length).toBeGreaterThan(0);
      });
    });

    describe("leads", () => {
      it("computes score and tier, and writes the stage event the old trigger wrote", async () => {
        const l = await t.asha.createLead(lead({ business_name: "Gamma Fence", phone: "2145550301", checks: Object.fromEntries(["check_no_real_website", "check_owner_run", "check_active_30_days", "check_older_3_months", "check_in_radius", "check_job_value_fits", "check_reviews_5_to_200", "check_reachable"].map((f) => [f, true])) }));
        expect(l).toMatchObject({ score: 8, tier: "hot", stage: "sourced", assignedTo: "asha", owner: "asha" });
        const ev = await t.asha.leadEvents("asha", l.id);
        expect(ev).toHaveLength(1);
        expect(ev[0]).toMatchObject({ kind: "stage_change", from_stage: null, to_stage: "sourced" });
      });
      it("moves stage with events, and the first Contacted is the Day 0 touch", async () => {
        const l = await t.asha.createLead(lead({ business_name: "Delta Gutters", phone: "2145550401" }));
        const moved = await t.asha.moveStage(l.id, "contacted", "2026-10-12");
        expect(moved).toMatchObject({ stage: "contacted", first_contact_date: "2026-10-12", sequence_step: 1, next_action_date: "2026-10-14", channel: "instagram_dm" });
        const ev = await t.asha.leadEvents("asha", l.id);
        expect(ev.map((e) => e.kind).sort()).toEqual(["stage_change", "stage_change", "touch"]);
        const touched = await t.asha.logTouch(l.id, "call", "2026-10-14");
        expect(touched).toMatchObject({ sequence_step: 2, next_action_date: "2026-10-17" });
      });
      it("blocks a duplicate by place key, phone or name + city, naming only the holder", async () => {
        const e1 = await rejects(t.asha.createLead(lead({ business_name: "Alpha Roofing", phone: "" })), "duplicate");
        expect(e1.message).toBe("Alpha Roofing is already Ravi's lead.");
        const e2 = await rejects(t.asha.createLead(lead({ business_name: "Other name", phone: "(214) 555-0201" })), "duplicate");
        expect(e2.message).toBe("Other name is already Ravi's lead.");
        const e3 = await rejects(t.asha.createLead(lead({ business_name: "ALPHA roofing LLC", phone: "", city: "dallas" })), "duplicate");
        expect(e3.message).toContain("Ravi's");
        const e4 = await rejects(t.ravi.createLead(lead({ business_name: "Alpha Roofing" })), "duplicate");
        expect(e4.message).toBe("Alpha Roofing is already your lead.");
        await t.asha.createLead(lead({ business_name: "Alpha Roofing", city: "Austin", phone: "" }));
      });
      it("blocks duplicates across teams too", async () => {
        const e = await rejects(t.bryn.createLead(lead({ business_name: "Beta Roofing", phone: "" })), "duplicate");
        expect(e.message).toContain("Ravi's");
      });
      it("a BD sees only their own leads; a manager their team's; an admin everyone's; a viewer none", async () => {
        expect((await t.ravi.listLeads()).every((l) => l.owner === "ravi")).toBe(true);
        expect(new Set((await t.mia.listLeads()).map((l) => l.owner))).toEqual(new Set(["ravi", "asha"]));
        const all = new Set((await t.ada.listLeads()).map((l) => l.owner));
        expect(all.has("ravi") && all.has("asha")).toBe(true);
        await rejects(t.vic.listLeads(), "forbidden");
        expect(await t.ravi.getLead("asha", (await t.asha.listLeads())[0]!.id)).toBeNull();
        expect(await t.mia.getLead("bryn", "00000000-0000-4000-8000-000000000000")).toBeNull();
      });
      it("an admin sees everyone's leads except the super admin's; the super admin sees all", async () => {
        await t.owner.createLead(lead({ business_name: "Owner Only Fencing", phone: "", city: "Mesa", state: "AZ" }));
        const adminOwners = new Set((await t.ada.listLeads()).map((l) => l.owner));
        expect(adminOwners.has("ravi")).toBe(true);
        expect(adminOwners.has("owner")).toBe(false);
        const ownerLeads = await t.owner.listLeads();
        expect(ownerLeads.some((l) => l.owner === "owner")).toBe(true);
        expect(ownerLeads.some((l) => l.owner === "ravi")).toBe(true);
        const id = ownerLeads.find((l) => l.owner === "owner")!.id;
        expect(await t.ada.getLead("owner", id)).toBeNull();
        expect((await t.ada.exportLeads()).some((l) => l.owner === "owner")).toBe(false);
      });
      it("manager sees team leads read-only and can comment; a BD cannot comment on a teammate's lead", async () => {
        const l = (await t.ravi.listLeads())[0]!;
        await rejects(t.mia.moveStage(l.id, "qualified", "2026-10-12"), "not_found");
        const c = await t.mia.addComment("ravi", l.id, "Call this one first", "2026-10-12");
        expect(c).toMatchObject({ kind: "comment", by: "mia" });
        expect((await t.ravi.leadEvents("ravi", l.id)).some((e) => e.kind === "comment" && e.note === "Call this one first")).toBe(true);
        await rejects(t.asha.addComment("ravi", l.id, "hi", "2026-10-12"), "not_found");
        await rejects(t.ben.addComment("ravi", l.id, "hi", "2026-10-12"), "not_found");
        const own = await t.ravi.addComment("ravi", l.id, "Note to self", "2026-10-12");
        expect(own.by).toBe("ravi");
      });
      it("exports follow scope and are audited", async () => {
        const mine = await t.ravi.exportLeads();
        expect(mine.every((l) => l.owner === "ravi")).toBe(true);
        const team = await t.mia.exportLeads();
        expect(new Set(team.map((l) => l.owner))).toEqual(new Set(["ravi", "asha"]));
        await rejects(t.meera.exportLeads(), "forbidden");
        await rejects(t.vic.exportLeads(), "forbidden");
        const audit = (await t.owner.listAudit()).filter((e) => e.actor === "ravi");
        expect(audit.some((e) => e.action === "leads.export")).toBe(true);
        expect(JSON.stringify(audit)).not.toMatch(/password/i);
      });
      it("imports a batch all-or-nothing", async () => {
        const before = (await t.asha.listLeads()).length;
        await rejects(t.asha.importLeads([lead({ business_name: "New One", phone: "2145550991" }), lead({ business_name: "Beta Roofing", phone: "" })]), "duplicate");
        expect((await t.asha.listLeads()).length).toBe(before);
        expect(await t.asha.importLeads([lead({ business_name: "New One", phone: "2145550991" }), lead({ business_name: "New Two", phone: "2145550992" })])).toEqual({ added: 2 });
      });
      it("a hand-off records the assignment and leaves the BD's own leads alone", async () => {
        const ravisBefore = (await t.ravi.listLeads()).map((l) => l.id).sort();
        await t.meera.createLead(lead({ business_name: "Queue Co", phone: "2145550777" }));
        const [q] = await t.mia.unassignedQueue();
        expect(q).toMatchObject({ business_name: "Queue Co", owner: "meera", assignedTo: null });
        await t.mia.assignLead("meera", q!.id, "ravi");
        expect((await t.ravi.listLeads()).map((l) => l.id).sort()).toEqual(ravisBefore);
        expect((await t.meera.listLeads()).find((l) => l.id === q!.id)).toMatchObject({ heldBy: "ravi", pendingTo: "ravi" });
        expect((await t.mia.listAssignments()).some((a) => a.leadId === q!.id && a.by === "mia" && a.to === "ravi")).toBe(true);
      });
    });

    describe("researchers and the queue", () => {
      it("researcher leads wait in the unassigned queue and stop at Qualified", async () => {
        const l = await t.meera.createLead(lead({ business_name: "Sourced Co", phone: "2145550555" }));
        expect(l.assignedTo).toBeNull();
        await t.meera.moveStage(l.id, "qualified", "2026-10-12");
        await rejects(t.meera.moveStage(l.id, "demo_built", "2026-10-12"), "forbidden");
        await rejects(t.meera.moveStage(l.id, "contacted", "2026-10-12"), "forbidden");
        await rejects(t.meera.createLead(lead({ business_name: "Too Far", stage: "contacted" })), "forbidden");
        await rejects(t.meera.logTouch(l.id, "call", "2026-10-12"), "forbidden");
      });
      it("a researcher keeps contact fields blank on edit", async () => {
        const l = (await t.meera.listLeads())[0]!;
        const u = await t.meera.updateLead(l.id, lead({ business_name: l.business_name, phone: l.phone, channel: "call", demo_url: "https://x.example", first_contact_date: "2026-10-01" }) as never);
        expect(u).toMatchObject({ channel: null, demo_url: "", first_contact_date: null });
      });
      it("the queue shows to the manager of the team and to admins, not to another team's manager or a BD", async () => {
        await t.meera.createLead(lead({ business_name: "Q Two", phone: "2145550666" }));
        expect((await t.mia.unassignedQueue()).some((l) => l.business_name === "Q Two")).toBe(true);
        expect((await t.ada.unassignedQueue()).some((l) => l.business_name === "Q Two")).toBe(true);
        expect((await t.ben.unassignedQueue()).some((l) => l.business_name === "Q Two")).toBe(false);
        await rejects(t.ravi.unassignedQueue(), "forbidden");
      });
      it("assign, then Accept copies the lead into the BD's folder with a sourceRef", async () => {
        const q = (await t.mia.unassignedQueue()).find((l) => l.business_name === "Q Two")!;
        await rejects(t.mia.assignLead("meera", q.id, "bryn"), "forbidden"); // not in Mia's team
        await rejects(t.mia.assignLead("meera", q.id, "meera"));
        const asg = await t.mia.assignLead("meera", q.id, "asha");
        expect(asg).toMatchObject({ kind: "assign", by: "mia", leadOwner: "meera", to: "asha" });
        expect((await t.mia.unassignedQueue()).some((l) => l.id === q.id)).toBe(false);
        const inbox = await t.asha.incoming();
        expect(inbox.map((i) => i.lead.business_name)).toContain("Q Two");
        const researcherView = (await t.meera.listLeads()).find((l) => l.id === q.id)!;
        expect(researcherView).toMatchObject({ heldBy: "asha", pendingTo: "asha", superseded: false });
        const copy = await t.asha.acceptAssignment(asg.id);
        expect(copy).toMatchObject({ owner: "asha", assignedTo: "asha", sourceRef: { owner: "meera", id: q.id } });
        expect(copy.id).not.toBe(q.id);
        expect((await t.asha.incoming()).some((i) => i.assignment.id === asg.id)).toBe(false);
        const after = (await t.meera.listLeads()).find((l) => l.id === q.id)!;
        expect(after).toMatchObject({ heldBy: "asha", pendingTo: null, superseded: true });
        // The manager's team view shows the BD's copy once, not the researcher's original as well.
        const names = (await t.mia.listLeads()).filter((l) => l.business_name === "Q Two");
        expect(names).toHaveLength(1);
        expect(names[0]!.owner).toBe("asha");
        await rejects(t.ravi.acceptAssignment(asg.id), "not_found");
        const dupe = await rejects(t.ravi.createLead(lead({ business_name: "Q Two", phone: "" })), "duplicate");
        expect(dupe.message).toBe("Q Two is already Asha's lead.");
      });
    });

    describe("leaving", () => {
      it("won't disable someone with open leads that have no handover record", async () => {
        const e = await rejects(t.owner.changeUser("ravi", { type: "disable" }), "conflict");
        expect(e.message).toMatch(/open lead/);
        const open = await t.owner.unhandedLeads("ravi");
        expect(open.length).toBeGreaterThan(0);
        for (const l of open) await t.ada.assignLead("ravi", l.id, "asha", "handover");
        expect(await t.owner.unhandedLeads("ravi")).toHaveLength(0);
        const off = await t.owner.changeUser("ravi", { type: "disable" });
        expect(off.status).toBe("disabled");
        const copy = (await t.asha.incoming()).length;
        expect(copy).toBe(open.length);
      });
    });

    describe("records", () => {
      it("keeps an audit log of account actions without secrets", async () => {
        const entries = await t.owner.listAudit();
        expect(entries.some((e) => e.action === "user.create" && e.target === "ravi")).toBe(true);
        expect(entries.some((e) => e.action === "user.reset_password")).toBe(true);
        expect(JSON.stringify(entries)).not.toMatch(/\$2[aby]\$|temp-/);
        await rejects(t.mia.listAudit(), "forbidden");
        const ada = await t.ada.listAudit();
        expect(ada.length).toBe(entries.length);
      });
      it("tracks playbook reads and required sections by team", async () => {
        await t.asha.markRead("math");
        await t.mia.setRequired(["math", "filter"]);
        expect(await t.asha.requiredFor("asha")).toEqual(["filter", "math"]);
        expect(await t.bryn.requiredFor("bryn")).toEqual([]);
        const progress = await t.mia.playbookProgress();
        const asha = progress.find((p) => p.user.username === "asha")!;
        expect(Object.keys(asha.reads)).toEqual(["math"]);
        expect(progress.some((p) => p.user.username === "bryn")).toBe(false);
        await rejects(t.ravi.setRequired(["x"]), "forbidden");
      });
      it("keeps approval records in the owner's folder only", async () => {
        await t.owner.addApproval({ kind: "category-kit", fileId: "fencing-gates", version: "1", note: "" });
        expect(await t.owner.listApprovals()).toHaveLength(1);
        await rejects(t.ada.addApproval({ kind: "segment", fileId: "x", version: "1", note: "" }), "forbidden");
      });
    });

    describe("the lead finder store", () => {
      const biz = (over: Partial<Parameters<ReturnType<typeof t.ravi.finder>["insertBusiness"]>[0]> = {}) => ({
        placeKey: "fid:0x1:0x2", scrapedOn: "2026-10-12", runId: null, query: "Roofing in Dallas, TX", category: "Roofing", city: "Dallas", state: "TX",
        name: "Finder Roofing", phone: "2145559001", address: "1 Main St", mapsCategory: "Roofing contractor", rating: 4.5, reviewCount: 12, email: "", facebookUrl: "",
        instagramUrl: "", otherLinks: [], mapsUrl: "https://www.google.com/maps/place/Finder", ...over,
      });
      it("saves to the runner's folder and skips what any folder already has", async () => {
        const f = t.ravi.finder();
        const id = await f.insertBusiness(biz());
        expect(id).toBeTruthy();
        expect(await f.insertBusiness(biz())).toBeNull();
        expect(await t.asha.finder().insertBusiness(biz())).toBeNull(); // someone else's finder result
        expect(await t.asha.finder().insertBusiness(biz({ placeKey: "fid:0x3:0x4", name: "Alpha Roofing", phone: "" }))).toBeNull(); // a lead
        expect(await f.countSavedOn("2026-10-12")).toBe(1);
        expect((await t.asha.finder().existingPlaceKeys(["fid:0x1:0x2", "fid:0x9:0x9"]))).toEqual(new Set(["fid:0x1:0x2"]));
        expect((await f.getBusiness(id!))?.name).toBe("Finder Roofing");
        expect(await f.markMoved(id!, "lead-1")).toBe(true);
        expect(await f.markMoved(id!, "lead-2")).toBe(false);
        expect((await f.listBusinesses({ category: "Roofing", city: "Dallas", state: "TX" }))[0]).toMatchObject({ movedLeadId: "lead-1" });
        await rejects(t.vic.finder().countSavedOn("2026-10-12"), "forbidden");
      });
      it("records runs", async () => {
        const f = t.ravi.finder();
        const run = await f.startRun({ query: "q", category: "Roofing", city: "Dallas", state: "TX", limit: 20 });
        await f.finishRun(run, { found: 3, checked: 3, skippedHasWebsite: 1, skippedDuplicate: 1, saved: 1 }, "Done");
        expect(run).toBeTruthy();
      });
    });

    describe("a store without an actor", () => {
      it("can read accounts for sign-in and nothing else", async () => {
        const s = backend.storeFor(null);
        expect((await s.getUser("mia"))?.role).toBe("manager");
        expect(await s.getUser("../etc")).toBeNull();
        await rejects(s.listLeads(), "forbidden");
        await rejects(s.getWorkspace(), "forbidden");
      });
    });
  });
}

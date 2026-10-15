// The migration from team/ files into MySQL: the same data must read the same through both Stores afterwards.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Store } from "@/lib/store/store";
import { importTeam } from "@/lib/store/teamImport";
import { readTeamSource } from "@/lib/store/teamSource";
import { createStore } from "@/lib/store/fileStore";
import { mysqlBackend, mysqlConfigured } from "./contract/mysqlBackend";
import { lead, seedTeam, tempRoot } from "./helpers/team";

const biz = (over: Record<string, unknown> = {}) => ({
  placeKey: "fid:0x1:0x2", scrapedOn: "2026-10-12", runId: null, query: "Roofing in Dallas, TX", category: "Roofing", city: "Dallas", state: "TX",
  name: "Finder Roofing", phone: "2145559001", address: "1 Main St", mapsCategory: "Roofing contractor", rating: 4.5, reviewCount: 12, email: "", facebookUrl: "",
  instagramUrl: "", otherLinks: [{ label: "Booking", url: "https://x.example" }], mapsUrl: "https://www.google.com/maps/place/Finder", hasWebsite: false, websiteUrl: "", whatsapp: "", ...over,
});

/** Everything the screens read, per person, in a stable order, so two Stores can be compared. */
async function view(s: Store) {
  const byId = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
  const scope = await s.readScope("leads.view").catch(() => null);
  return {
    leads: byId(await s.listLeads().catch(() => [])),
    kits: byId(await s.listKits().catch(() => [])),
    events: scope ? byId(scope.events) : null,
    queue: byId(await s.unassignedQueue().catch(() => [])),
    incoming: (await s.incoming().catch(() => [])).map((i) => i.assignment.id).sort(),
    playbook: await s.getPlaybook().catch(() => null),
    directory: await s.directory(),
    teams: await s.getTeams(),
    workspace: await s.getWorkspace(),
    audit: await s.listAudit().then((a) => byId(a)).catch(() => null),
    approvals: await s.listApprovals().catch(() => null),
  };
}

describe.skipIf(!mysqlConfigured)("importing team/ into MySQL", () => {
  let root = "";
  let cleanupRoot: () => Promise<void>;
  let cast: Awaited<ReturnType<typeof seedTeam>>;
  let db: Awaited<ReturnType<typeof mysqlBackend>>;

  beforeAll(async () => {
    ({ root, cleanup: cleanupRoot } = await tempRoot());
    cast = await seedTeam(root);
    const { ravi, asha, meera, mia, owner } = cast;
    const a = await ravi.createLead(lead({ business_name: "Alpha Roofing", phone: "2145550201", notes: "Called twice" }));
    await ravi.moveStage(a.id, "contacted", "2026-10-12");
    await ravi.logTouch(a.id, "call", "2026-10-14");
    await ravi.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" });
    await mia.addComment("ravi", a.id, "Call this one first", "2026-10-12");
    const q = await meera.createLead(lead({ business_name: "Queue Co", phone: "2145550777", last_post_date: "2026-09-01" }));
    const asg = await mia.assignLead("meera", q.id, "asha");
    await asha.acceptAssignment(asg.id);
    const pending = await meera.createLead(lead({ business_name: "Pending Co", phone: "2145550778" }));
    await mia.assignLead("meera", pending.id, "ravi");
    await asha.markRead("math");
    await mia.setRequired(["math", "filter"]);
    await owner.addApproval({ kind: "category-kit", fileId: "fencing-gates", version: "1", note: "ok" });
    const f = ravi.finder();
    const id = await f.insertBusiness(biz());
    await f.markMoved(id!, a.id);
    const run = await f.startRun({ query: "q", category: "Roofing", city: "Dallas", state: "TX", limit: 20 });
    await f.finishRun(run, { found: 3, checked: 3, skippedHasWebsite: 1, skippedDuplicate: 1, saved: 1 }, "Done");
    await f.startRun({ query: "q2", category: "Roofing", city: "Dallas", state: "TX", limit: 20 }); // never finished
    await ravi.saveProfile({ defaultDevice: "mobile" });
    db = await mysqlBackend();
  });
  afterAll(async () => {
    await db?.cleanup();
    await cleanupRoot();
  });

  const count = async (table: string) => Number(((await db.pool.query<import("mysql2/promise").RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${table}\``))[0][0] as { n: number }).n);

  it("a dry run reports the counts and writes nothing", async () => {
    const src = await readTeamSource(root);
    const report = await importTeam(db.pool, src, { apply: false });
    expect(report.reconciled).toBe(true);
    expect(report.problems).toEqual([]);
    const got = Object.fromEntries(report.kinds.map((k) => [k.kind, k.inserted]));
    expect(got).toMatchObject({ workspace: 1, teams: 1, users: 9, leads: 4, kits: 1, "finder businesses": 1, "finder runs": 2 });
    expect(report.kinds.every((k) => k.found === k.valid && k.present === 0 && k.rejected === 0)).toBe(true);
    for (const t of ["users", "leads", "lead_events", "audit_log", "workspace"]) expect(await count(t)).toBe(0);
  });

  it("--apply writes it, and every screen reads the same through MySQL as through the files", async () => {
    const src = await readTeamSource(root);
    const report = await importTeam(db.pool, src, { apply: true });
    expect(report.reconciled).toBe(true);
    expect(await count("users")).toBe(src.users.length);
    expect(await count("leads")).toBe(src.leads.length);
    expect(await count("lead_events")).toBe(src.events.length);
    expect(await count("audit_log")).toBe(src.audit.length);
    expect(report.tableRows.leads).toBe(src.leads.length);

    const actors: [string, import("@/lib/store/types").Actor][] = [
      ["owner", { username: "owner", role: "super_admin", team: null }], ["ada", { username: "ada", role: "admin", team: null }],
      ["mia", { username: "mia", role: "manager", team: "team-a" }], ["ravi", { username: "ravi", role: "bd", team: "team-a" }],
      ["asha", { username: "asha", role: "bd", team: "team-a" }], ["meera", { username: "meera", role: "researcher", team: "team-a" }],
      ["bryn", { username: "bryn", role: "bd", team: "team-b" }], ["vic", { username: "vic", role: "viewer", team: null }],
    ];
    for (const [name, actor] of actors) {
      expect(await view(db.storeFor(actor)), name).toEqual(await view(createStore(actor, root)));
    }
    // The duplicate guard came across too.
    await expect(db.storeFor(actors[4]![1]).createLead(lead({ business_name: "Alpha Roofing", phone: "" }))).rejects.toMatchObject({ code: "duplicate" });
    // And so did the finder.
    const f = db.storeFor(actors[3]![1]).finder();
    expect(await f.insertBusiness(biz())).toBeNull();
    expect((await f.listBusinesses({ category: "Roofing", city: "Dallas", state: "TX" }))[0]).toMatchObject({ name: "Finder Roofing", movedLeadId: expect.any(String) });
  });

  it("people can sign in with the same passwords: only the hashes moved, and they are unchanged", async () => {
    const was = JSON.parse(await readFile(path.join(root, "team", "users", "ravi.json"), "utf8"));
    expect((await db.storeFor(null).getUser("ravi"))?.tempPasswordHash).toBe(was.tempPasswordHash);
    const prof = JSON.parse(await readFile(path.join(root, "team", "data", "owner", "profile.json"), "utf8"));
    expect((await db.storeFor(null).getProfile("owner"))?.passwordHash).toBe(prof.passwordHash);
  });

  it("running it again adds nothing and changes nothing", async () => {
    const before = { users: await count("users"), events: await count("lead_events"), keys: await count("lead_keys"), seq: await count("audit_log") };
    await db.pool.query("UPDATE users SET full_name = 'Changed in the database' WHERE username = 'mia'");
    const report = await importTeam(db.pool, await readTeamSource(root), { apply: true });
    expect(report.reconciled).toBe(true);
    expect(report.kinds.every((k) => k.inserted === 0 && k.present === k.valid)).toBe(true);
    expect({ users: await count("users"), events: await count("lead_events"), keys: await count("lead_keys"), seq: await count("audit_log") }).toEqual(before);
    // The database copy wins once the app runs on it.
    expect((await db.storeFor(null).getUser("mia"))?.fullName).toBe("Changed in the database");
  });

  it("never touches team/", async () => {
    const list = async () => (await readdir(path.join(root, "team"), { recursive: true })).sort();
    const before = await list();
    const bytes = await readFile(path.join(root, "team", "workspace.json"), "utf8");
    await importTeam(db.pool, await readTeamSource(root), { apply: false });
    expect(await list()).toEqual(before);
    expect(await readFile(path.join(root, "team", "workspace.json"), "utf8")).toBe(bytes);
  });

  it("lists what it can't use instead of dropping it, and keeps clashing duplicates", async () => {
    const { root: r2, cleanup } = await tempRoot();
    const t2 = await seedTeam(r2);
    await t2.ravi.createLead(lead({ business_name: "Twin Roofing", phone: "2145550900" }));
    const b = await mysqlBackend();
    try {
      // A hand-made clash: a second lead file with the same phone under another person, as a merge of two laptops could produce.
      const twin = JSON.parse(await readFile(path.join(r2, "team", "data", "ravi", "leads", (await readdir(path.join(r2, "team", "data", "ravi", "leads")))[0]!), "utf8"));
      const copy = { ...twin, id: "11111111-1111-4111-8111-111111111111", owner: "asha", assignedTo: "asha", business_name: "Twin Roofing Too", created_at: "2030-01-01T00:00:00.000Z" };
      await mkdir(path.join(r2, "team", "data", "asha", "leads"), { recursive: true });
      await writeFile(path.join(r2, "team", "data", "asha", "leads", `${copy.id}.json`), JSON.stringify(copy));
      // Unusable things: torn JSON, an invalid record, a folder with no account.
      await writeFile(path.join(r2, "team", "data", "asha", "leads", "22222222-2222-4222-8222-222222222222.json"), "{ not json");
      await writeFile(path.join(r2, "team", "data", "ravi", "events.jsonl"), (await readFile(path.join(r2, "team", "data", "ravi", "events.jsonl"), "utf8")) + '{"kind":"nope"}\n');
      await mkdir(path.join(r2, "team", "data", "ghost"), { recursive: true });
      await writeFile(path.join(r2, "team", "data", "ghost", "profile.json"), "{}");

      const src = await readTeamSource(r2);
      expect(src.found.leads).toBe(3);
      expect(src.problems.map((p) => p.kind).sort()).toEqual(["events", "folders", "leads"]);
      const report = await importTeam(b.pool, src, { apply: true });
      expect(report.reconciled).toBe(true);
      expect(report.kinds.find((k) => k.kind === "leads")).toMatchObject({ found: 3, valid: 2, inserted: 2 });
      expect(report.clashes).toHaveLength(1); // the copy has another name, so only the phone number is shared
      expect(report.clashes[0]).toMatchObject({ type: "lead", matchedOn: "phone number", businessName: "Twin Roofing Too" });
      expect(report.clashes[0]!.sameAs).toContain("Twin Roofing");
      const [leads] = await b.pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT COUNT(*) AS n FROM leads");
      expect(Number(leads[0]!.n)).toBe(2);
    } finally {
      await b.cleanup();
      await cleanup();
    }
  });
});

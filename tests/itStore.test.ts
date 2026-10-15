// IT Prospects' Store (MySQL only: the area was built after the team/ files were retired). Runs top to bottom against one
// throwaway database with the standard cast: team-a is Mia (manager), Ravi and Asha (BDs), Meera (researcher); team-b is
// Ben (manager) and Bryn (BD); Ada is an admin, Vic a viewer.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { todayIso } from "@/lib/clock";
import type { ItProspectInput, ItSignalInput } from "@/lib/it/model";
import { StoreError } from "@/lib/store/errors";
import type { NewBusiness } from "@/lib/store/store";
import { mysqlBackend, mysqlConfigured } from "./contract/mysqlBackend";
import { fileBackend } from "./contract/fileBackend";
import { seedCast } from "./helpers/team";

const prospect = (over: Partial<ItProspectInput> = {}): ItProspectInput => ({
  segment: "buyer", company: "Acme Logistics", companyDomain: "acmelogistics.com", websiteUrl: "https://acmelogistics.com/", linkedinUrl: "",
  contactName: "Dana Diaz", contactTitle: "CTO", email: "dana@acmelogistics.com", phone: "", whatsapp: "", city: "Austin", region: "TX", country: "US",
  teamSize: "11–50", notes: "", ...over,
});
const signal = (over: Partial<ItSignalInput> = {}): ItSignalInput => ({
  type: "dev_role", url: "https://www.linkedin.com/jobs/view/1", quote: "Senior React Developer, remote", signalDate: todayIso(), source: "LinkedIn", ...over,
});
const biz = (over: Partial<NewBusiness> = {}): NewBusiness => ({
  placeKey: "fid:0x11:0x22", scrapedOn: todayIso(), runId: null, query: "Web design agencies in Austin, TX", category: "Web design agencies", city: "Austin", state: "TX",
  name: "Pixel Forge Studio", phone: "5125550199", address: "9 Congress Ave", mapsCategory: "Website designer", rating: 4.8, reviewCount: 61, email: "hi@pixelforge.dev",
  facebookUrl: "", instagramUrl: "", otherLinks: [], mapsUrl: "https://www.google.com/maps/place/Pixel+Forge/data=!4m2!3m1!1s0x11:0x22", hasWebsite: true,
  websiteUrl: "https://pixelforge.dev/", whatsapp: "", ...over,
});

const rejects = async (p: Promise<unknown>, code?: string) => {
  const e = await p.then(() => null, (x) => x as StoreError);
  expect(e).toBeInstanceOf(StoreError);
  if (code) expect(e?.code).toBe(code);
  return e!;
};

describe("the file Store", () => {
  it("doesn't hold IT Prospects", async () => {
    const b = await fileBackend();
    try {
      expect(() => b.storeFor({ username: "x", role: "bd", team: null }).it()).toThrow(/MySQL/);
    } finally {
      await b.cleanup();
    }
  });
});

describe.skipIf(!mysqlConfigured)("IT Prospects store (MySQL)", () => {
  let backend: Awaited<ReturnType<typeof mysqlBackend>>;
  let t: Awaited<ReturnType<typeof seedCast>>;
  let acme: string;

  beforeAll(async () => {
    backend = await mysqlBackend();
    t = await seedCast(backend);
  });
  afterAll(() => backend.cleanup());

  describe("adding", () => {
    it("saves a prospect with its first signal, fresh and scored", async () => {
      const p = await t.ravi.it().createProspect(prospect(), { signal: signal(), source: "signal" });
      acme = p.id;
      expect(p).toMatchObject({ owner: "ravi", assignee: null, stage: "new", source: "signal", signalState: "fresh", score: 1, tier: "skip" });
      expect(p.signals).toHaveLength(1);
      expect(p.latest?.type).toBe("dev_role");
    });
    it("refuses a duplicate for everyone, naming the holder and the key", async () => {
      const e = await rejects(t.asha.it().createProspect(prospect({ company: "ACME", email: "", websiteUrl: "https://www.acmelogistics.com/careers" })), "duplicate");
      expect(e.message).toBe("Already Ravi's prospect “Acme Logistics” (same website domain).");
      await rejects(t.bryn.it().createProspect(prospect({ companyDomain: "", websiteUrl: "", email: "dana@acmelogistics.com" })), "duplicate");
      const self = await rejects(t.ravi.it().createProspect(prospect({ companyDomain: "", email: "", city: "Austin", company: "Acme Logistics" })), "duplicate");
      expect(self.message).toMatch(/^Already your prospect .* \(same name and city\)\.$/);
    });
    it("tells the inbox whether the caller can add to the duplicate", async () => {
      expect(await t.ravi.it().findDuplicate({ companyDomain: "acmelogistics.com", email: "", phone: "", mapsUrl: "", company: "", city: "" })).toMatchObject({ prospectId: acme, canEdit: true });
      expect(await t.asha.it().findDuplicate({ companyDomain: "acmelogistics.com", email: "", phone: "", mapsUrl: "", company: "", city: "" })).toMatchObject({ canEdit: false, holderName: "Ravi" });
      expect(await t.asha.it().findDuplicate({ companyDomain: "nobody.example", email: "", phone: "", mapsUrl: "", company: "", city: "" })).toBeNull();
    });
    it("keeps viewers out entirely", async () => {
      await rejects(t.vic.it().listProspects(), "forbidden");
      await rejects(t.vic.it().createProspect(prospect({ companyDomain: "vic.example", email: "", company: "Vic Co" })), "forbidden");
    });
  });

  describe("who sees what", () => {
    it("scopes the list like leads: own, team, all", async () => {
      await t.bryn.it().createProspect(prospect({ company: "Bryn Labs", companyDomain: "brynlabs.io", email: "", websiteUrl: "", city: "Denver", region: "CO" }));
      await t.meera.it().createProspect(prospect({ company: "Meera Digital", segment: "agency", companyDomain: "meeradigital.com", email: "", websiteUrl: "", city: "Dallas" }));
      const names = async (s: typeof t.ravi) => (await s.it().listProspects()).map((p) => p.company).sort();
      expect(await names(t.ravi)).toEqual(["Acme Logistics"]);
      expect(await names(t.asha)).toEqual([]);
      expect(await names(t.meera)).toEqual(["Meera Digital"]);
      expect(await names(t.mia)).toEqual(["Acme Logistics", "Meera Digital"]);
      expect(await names(t.ben)).toEqual(["Bryn Labs"]);
      expect(await names(t.ada)).toEqual(["Acme Logistics", "Bryn Labs", "Meera Digital"]);
      expect(await t.asha.it().getProspect(acme)).toBeNull();
      expect((await t.mia.it().getProspect(acme))?.company).toBe("Acme Logistics");
    });
  });

  describe("working a prospect", () => {
    it("only the owner or the assignee edits", async () => {
      await rejects(t.mia.it().updateProspect(acme, prospect({ notes: "x" })), "forbidden");
      await rejects(t.asha.it().moveStage(acme, "qualified"), "forbidden");
      const p = await t.ravi.it().updateProspect(acme, prospect({ contactTitle: "VP Engineering", notes: "Met at a meetup" }));
      expect(p).toMatchObject({ contactTitle: "VP Engineering", notes: "Met at a meetup" });
    });
    it("refuses an edit that would take another prospect's key, and frees old keys", async () => {
      await rejects(t.ravi.it().updateProspect(acme, prospect({ companyDomain: "meeradigital.com" })), "duplicate");
      await t.ravi.it().updateProspect(acme, prospect({ companyDomain: "acme.io", websiteUrl: "https://acme.io", email: "dana@acme.io" }));
      const freed = await t.asha.it().createProspect(prospect({ company: "Old Acme Domain Owner", companyDomain: "acmelogistics.com", email: "", websiteUrl: "", city: "Waco" }));
      await t.asha.it().deleteProspect(freed.id);
    });
    it("qualifies and scores: a fresh signal counts as the trigger", async () => {
      const p = await t.ravi.it().setQualifier(acme, { budget: true, buys_often: true, reachable: true, offshore_ok: true, proof_fit: false, trigger: false });
      expect(p).toMatchObject({ score: 5, tier: "hot" });
    });
    it("moves stages and keeps the history", async () => {
      await t.ravi.it().moveStage(acme, "qualified");
      await t.ravi.it().moveStage(acme, "contacted");
      await rejects(t.ravi.it().moveStage(acme, "nowhere" as never));
      const ev = await t.ravi.it().events(acme);
      expect(ev.map((e) => e.kind)).toEqual(["created", "stage", "stage"]);
      expect(ev[2]).toMatchObject({ fromStage: "qualified", toStage: "contacted" });
    });
  });

  describe("assigning", () => {
    it("a manager hands a team prospect to a BD, who can then work it", async () => {
      await rejects(t.ravi.it().assign(acme, "asha"), "forbidden");
      await rejects(t.ben.it().assign(acme, "bryn"), "forbidden");
      await rejects(t.mia.it().assign(acme, "bryn"), "forbidden");
      await rejects(t.ada.it().assign(acme, "vic"));
      const p = await t.mia.it().assign(acme, "asha");
      expect(p.assignee).toBe("asha");
      expect((await t.asha.it().listProspects()).map((x) => x.id)).toContain(acme);
      await t.asha.it().moveStage(acme, "replied");
      await rejects(t.asha.it().deleteProspect(acme), "forbidden");
      expect((await t.mia.it().assignable()).map((u) => u.username).sort()).toEqual(["asha", "meera", "mia", "ravi"]);
    });
  });

  describe("signals and comments", () => {
    it("adds signals, refuses the same link twice, deletes one", async () => {
      const s = await t.asha.it().addSignal(acme, signal({ type: "project_post", url: "https://www.upwork.com/jobs/2", signalDate: "2026-01-02" }));
      await rejects(t.ravi.it().addSignal(acme, signal({ url: "https://www.upwork.com/jobs/2" })), "duplicate");
      await rejects(t.bryn.it().addSignal(acme, signal({ url: "https://x.example/3" })), "forbidden");
      expect((await t.ravi.it().getProspect(acme))?.signals).toHaveLength(2);
      await t.ravi.it().deleteSignal(acme, s.id);
      expect((await t.ravi.it().getProspect(acme))?.signals).toHaveLength(1);
    });
    it("goes stale when the newest signal is old", async () => {
      const p = await t.meera.it().createProspect(prospect({ company: "Old Post Co", companyDomain: "oldpost.co", email: "", websiteUrl: "", city: "Tulsa" }), {
        signal: signal({ url: "https://www.indeed.com/viewjob?jk=9", signalDate: "2025-01-01" }),
      });
      expect(p.signalState).toBe("stale");
    });
    it("comments within the comment scope", async () => {
      await t.mia.it().addComment(acme, "Good fit for the trial developer offer.");
      await rejects(t.bryn.it().addComment(acme, "hi"), "not_found");
      await rejects(t.mia.it().addComment(acme, "   "));
      expect((await t.ravi.it().events(acme)).filter((e) => e.kind === "comment").map((e) => e.by)).toEqual(["mia"]);
    });
  });

  describe("export", () => {
    it("exports within scope and writes an audit line", async () => {
      expect((await t.mia.it().exportProspects()).length).toBeGreaterThanOrEqual(2);
      await rejects(t.meera.it().exportProspects(), "forbidden");
      expect((await t.owner.listAudit(50)).some((a) => a.action === "it.export" && a.actor === "mia")).toBe(true);
    });
  });

  describe("the IT finder", () => {
    it("saves into its own tables, apart from the lead finder", async () => {
      const lf = await t.ravi.finder().insertBusiness({ ...biz(), category: "Roofing" });
      expect(lf).toBeTruthy(); // the lead finder has the same place
      const f = t.ravi.it().finder();
      const id = await f.insertBusiness(biz());
      expect(id).toBeTruthy(); // ...and the IT finder still saves it: separate keys
      expect(await f.insertBusiness(biz())).toBeNull();
      expect(await t.asha.it().finder().insertBusiness(biz({ placeKey: "fid:0x99:0x98", phone: "(512) 555-0199" }))).toBeNull();
      expect(await f.countSavedOn(todayIso())).toBe(1);
      expect(await t.asha.it().finder().countSavedOn(todayIso())).toBe(0);
      expect(await f.existingPlaceKeys(["fid:0x11:0x22", "fid:0x0:0x0"])).toEqual(new Set(["fid:0x11:0x22"]));
      expect((await f.listBusinesses({ category: "Web design agencies", city: "Austin", state: "TX" }))[0]).toMatchObject({ name: "Pixel Forge Studio", hasWebsite: true, movedLeadId: null });
      expect(await t.asha.it().finder().getBusiness(id!)).toBeNull();
      await rejects(t.vic.it().finder().countSavedOn(todayIso()), "forbidden");
      const run = await f.startRun({ query: "q", category: "Web design agencies", city: "Austin", state: "TX", limit: 20 });
      await f.finishRun(run, { found: 1, checked: 1, skippedHasWebsite: 0, skippedDuplicate: 0, saved: 1 }, "Done");
    });
    it("adds a finder result as a prospect once, and its place then blocks the finder", async () => {
      const f = t.ravi.it().finder();
      const [b] = await f.listBusinesses({ category: "Web design agencies", city: "Austin", state: "TX" });
      const p = await t.ravi.it().createProspect(prospect({ segment: "agency", company: b!.name, companyDomain: "pixelforge.dev", email: b!.email, websiteUrl: b!.websiteUrl, mapsUrl: b!.mapsUrl, phone: b!.phone }), {
        source: "finder", finderBusinessId: b!.id,
      });
      expect(p).toMatchObject({ source: "finder", segment: "agency" });
      expect((await f.getBusiness(b!.id))?.movedLeadId).toBe(p.id);
      expect(await t.asha.it().finder().existingPlaceKeys(["fid:0x11:0x22"])).toEqual(new Set(["fid:0x11:0x22"]));
      await rejects(t.ravi.it().createProspect(prospect({ company: "Other", companyDomain: "other.dev", email: "", websiteUrl: "" }), { finderBusinessId: b!.id }), "conflict");
    });
  });

  describe("deleting", () => {
    it("the owner deletes, and the history and keys go with it", async () => {
      await t.ravi.it().deleteProspect(acme);
      expect(await t.ravi.it().getProspect(acme)).toBeNull();
      await t.asha.it().createProspect(prospect({ companyDomain: "acme.io", email: "", websiteUrl: "" }));
    });
    it("leaves the local leads alone", async () => {
      expect(await t.owner.listLeads()).toEqual([]);
    });
  });
});

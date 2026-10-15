// What is specific to the file Store: the layout and format of team/. The behaviour every Store shares is in
// tests/contract/storeContract.ts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { StoreError } from "@/lib/store/errors";
import { stableStringify } from "@/lib/store/json";
import { migrateData, FormatTooNewError } from "@/lib/store/migrate";
import { assertValid, validateFile } from "@/lib/store/schemas";
import { dupKeys, normText, phoneDigits } from "@/lib/store/dupes";
import { lead, seedTeam, tempRoot } from "./helpers/team";

let root = "";
let cleanup: () => Promise<void>;
let t: Awaited<ReturnType<typeof seedTeam>>;

beforeAll(async () => {
  ({ root, cleanup } = await tempRoot());
  t = await seedTeam(root);
});
afterAll(() => cleanup());

describe("file format", () => {
  it("writes JSON with sorted keys, two spaces and a trailing newline", async () => {
    const txt = await readFile(path.join(root, "team", "workspace.json"), "utf8");
    expect(txt.endsWith("}\n")).toBe(true);
    expect(txt).toBe(stableStringify(JSON.parse(txt)) + "\n");
    expect(Object.keys(JSON.parse(txt))).toEqual([...Object.keys(JSON.parse(txt))].sort());
  });
  it("never writes a plain-text password", async () => {
    const files = [path.join(root, "team", "users", "ravi.json"), path.join(root, "team", "data", "owner", "profile.json")];
    for (const f of files) {
      const txt = await readFile(f, "utf8");
      expect(txt).not.toMatch(/temp-ravi|owner-password-1/);
      expect(txt).toMatch(/\$2[aby]\$/);
    }
  });
  it("validates every kind of file and refuses an invalid write", async () => {
    expect(validateFile("schema", { version: 1 }).ok).toBe(true);
    expect(validateFile("user", { username: "x" }).ok).toBe(false);
    expect(() => assertValid("kit", { id: "x" })).toThrow(/Refusing to write/);
  });
  it("migrates forward in memory and refuses a newer format", () => {
    expect(migrateData("kit", { a: 1 }, 1, {}, 1)).toEqual({ a: 1 });
    expect(migrateData("kit", { n: 0 }, 1, { 1: (_k, d) => ({ ...(d as object), n: 1 }) }, 2)).toEqual({ n: 1 });
    expect(() => migrateData("kit", {}, 3, {}, 2)).toThrow(FormatTooNewError);
  });
});

describe("duplicate keys", () => {
  it("normalises names, phones and places", () => {
    expect(normText("Smith Roofing, LLC")).toBe(normText("smith roofing"));
    expect(phoneDigits("+1 (214) 555-0101")).toBe("2145550101");
    expect(phoneDigits("555")).toBeNull();
    const keys = dupKeys({ business_name: "Smith Roofing", city: "Dallas", phone: "214-555-0101", google_maps_url: "https://www.google.com/maps/place/Smith/data=!4m5!3m4!1s0x864c:0xabc123" });
    expect(keys).toEqual(["m:fid:0x864c:0xabc123", "p:2145550101", "n:smithroofing|dallas"]);
  });
});

describe("where the file Store puts things", () => {
  it("stores the score nowhere: it is computed on read", async () => {
    const l = await t.asha.createLead(lead({ business_name: "Gamma Fence", phone: "2145550301" }));
    const raw = JSON.parse(await readFile(path.join(root, "team/data/asha/leads", `${l.id}.json`), "utf8"));
    expect(raw).not.toHaveProperty("score");
  });
  it("writes an audit line in the actor's own folder", async () => {
    await t.ravi.createLead(lead({ business_name: "Export Co", phone: "2145550881" }));
    await t.ravi.exportLeads();
    const audit = await readFile(path.join(root, "team/data/ravi/audit.jsonl"), "utf8");
    expect(audit).toContain('"action":"leads.export"');
    expect(audit).not.toMatch(/password/i);
  });
  it("a hand-off never writes another person's files", async () => {
    const sha = async (u: string) => (await readdir(path.join(root, "team/data", u), { recursive: true }).catch(() => [])).sort().join();
    const before = { ravi: await sha("ravi"), meera: await sha("meera") };
    await t.meera.createLead(lead({ business_name: "Queue Co", phone: "2145550777" }));
    const [q] = await t.mia.unassignedQueue();
    await t.mia.assignLead("meera", q!.id, "ravi");
    const after = { ravi: await sha("ravi"), meera: await sha("meera") };
    expect(after.ravi).toBe(before.ravi);
    expect(after.meera).not.toBe(before.meera);
    expect(await readdir(path.join(root, "team/data/mia"))).toContain("assignments.jsonl");
  });
  it("keeps finder rows and runs as lines in the runner's folder", async () => {
    const f = t.ravi.finder();
    const id = await f.insertBusiness({
      placeKey: "fid:0x1:0x2", scrapedOn: "2026-10-12", runId: null, query: "Roofing in Dallas, TX", category: "Roofing", city: "Dallas", state: "TX",
      name: "Finder Roofing", phone: "2145559001", address: "", mapsCategory: "", rating: null, reviewCount: null, email: "", facebookUrl: "",
      instagramUrl: "", otherLinks: [], mapsUrl: "https://www.google.com/maps/place/Finder", hasWebsite: false, websiteUrl: "", whatsapp: "",
    });
    expect(id).toBeTruthy();
    expect(await readFile(path.join(root, "team/data/ravi/finder/businesses.jsonl"), "utf8")).toContain("Finder Roofing");
    const run = await f.startRun({ query: "q", category: "Roofing", city: "Dallas", state: "TX", limit: 20 });
    await f.finishRun(run, { found: 3, checked: 3, skippedHasWebsite: 1, skippedDuplicate: 1, saved: 1 }, "Done");
    const lines = (await readFile(path.join(root, "team/data/ravi/finder/runs.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.map((l) => l.kind)).toEqual(["start", "finish"]);
  });
  it("reads a finder line written before the website fields existed as 'no website'", async () => {
    const f = t.ravi.finder();
    const id = await f.insertBusiness({
      placeKey: "fid:0x5:0x6", scrapedOn: "2026-10-12", runId: null, query: "Roofing in Dallas, TX", category: "Roofing", city: "Dallas", state: "TX",
      name: "Old Roofing", phone: "2145559003", address: "", mapsCategory: "", rating: null, reviewCount: null, email: "", facebookUrl: "",
      instagramUrl: "", otherLinks: [], mapsUrl: "https://www.google.com/maps/place/Old", hasWebsite: false, websiteUrl: "", whatsapp: "",
    });
    const file = path.join(root, "team/data/ravi/finder/businesses.jsonl");
    const rewritten = (await readFile(file, "utf8")).split("\n").filter(Boolean).map((l) => {
      const o = JSON.parse(l);
      delete o.hasWebsite; delete o.websiteUrl; delete o.whatsapp;
      return JSON.stringify(o);
    }).join("\n") + "\n";
    await writeFile(file, rewritten);
    expect(await t.ravi.finder().getBusiness(id!)).toMatchObject({ hasWebsite: false, websiteUrl: "", whatsapp: "" });
  });
  it("refuses to write outside the caller's folder", async () => {
    const e = await t.vic.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" }).then(() => null, (x) => x);
    expect(e).toBeInstanceOf(StoreError);
  });
});

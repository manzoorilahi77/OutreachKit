// Runs the real scraper (Chromium + the file Store) against a stand-in Maps served from this machine, built from the saved fixtures.
// Skipped unless Playwright's Chromium is installed. It never contacts Google.
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runScrape, type ScrapeResult } from "@/lib/scrape/scraper";
import { addBusinessToLeads, type MoveResult } from "@/lib/scrape/addToLeads";
import { localDay } from "@/lib/scrape/limits";
import type { BusinessRow } from "@/lib/scrape/types";
import type { FinderStore, Store } from "@/lib/store/store";
import { seedTeam, tempRoot } from "./helpers/team";

const can = existsSync(chromium.executablePath());

const fx = (n: string) => readFileSync(`tests/fixtures/maps/${n}`, "utf8").replace(/<img[^>]*>/g, "");
const PLACES: Record<string, string> = {
  "Summit+Roofing": "website.html", "Lone+Star+Roof+Pros": "no-website.html", "Gutter+Works+Dallas": "no-website-no-phone.html",
};
const ALL = ["Summit Roofing", "Lone Star Roof Pros", "Gutter Works Dallas"];

describe.skipIf(!can)("scraper against a stand-in Maps", () => {
  let server: Server;
  let base = "";
  let captchaOn: string | null = null; // a place whose page is the "unusual traffic" page
  let store: Store;
  let finder: FinderStore;
  let cleanup: () => Promise<void>;
  let fresh: () => Promise<Store>;

  beforeAll(async () => {
    const tmp = await tempRoot("okit-run-");
    cleanup = tmp.cleanup;
    let n = 0;
    // A new folder for every test, so each starts with nothing saved.
    fresh = async () => {
      const root = `${tmp.root}/t${++n}`;
      const t = await seedTeam(root);
      return t.ravi;
    };

    server = createServer((req, res) => {
      const path = decodeURIComponent((req.url ?? "").split("?")[0]!);
      const html = (body: string, status = 200) => { res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" }); res.end(`<!doctype html><html><body>${body}</body></html>`); };
      if (path.startsWith("/maps/search/")) {
        const feed = fx("feed-cards.html").split("https://www.google.com").join(base);
        return html(feed.replace(/<\/div>\s*$/, "<div>You’ve reached the end of the list.</div></div>"));
      }
      if (path.startsWith("/sorry/")) return html("<p>Our systems have detected unusual traffic from your computer network.</p>");
      const place = Object.keys(PLACES).find((k) => path.includes("/maps/place/" + k.replace(/\+/g, " ")) || path.includes("/maps/place/" + k));
      if (place) {
        if (captchaOn === place) { res.writeHead(302, { Location: "/sorry/index?continue=x" }); return res.end(); }
        return html(fx(PLACES[place]!));
      }
      html("<p>not found</p>", 404);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 30000);

  afterAll(async () => {
    server?.close();
    await cleanup?.();
  });

  beforeEach(async () => {
    captchaOn = null;
    store = await fresh();
    finder = store.finder();
  });

  const run = (limit: number, addLead?: (b: BusinessRow) => Promise<MoveResult>): Promise<ScrapeResult> =>
    runScrape({
      finder, category: "Roofing", city: "Dallas", state: "TX", limit, baseUrl: base, delayMs: () => 0,
      addLead: addLead ?? ((b) => addBusinessToLeads(store, b.id)),
    });
  const saved = () => finder.listBusinesses({ category: "Roofing", city: "Dallas", state: "TX" });
  const names = async () => (await saved()).map((b) => b.name).reverse();

  it("saves every listing, with and without a website, makes each a lead, and records the run", async () => {
    const r = await run(20);
    expect(r).toMatchObject({ found: 3, checked: 3, saved: 3, withWebsite: 1, withoutWebsite: 2, leadsRefused: 0, skippedDuplicate: 0, stopCode: "end_of_results", savedToday: 3 });
    expect((await names()).sort()).toEqual([...ALL].sort());
    const rows = await saved();
    expect(rows.every((b) => b.movedLeadId)).toBe(true);
    expect(rows.find((b) => b.name === "Lone Star Roof Pros")).toMatchObject({ phone: "+1 214-555-0147", rating: 4.8, scrapedOn: localDay(), hasWebsite: false });
    expect(rows.find((b) => b.name === "Summit Roofing")).toMatchObject({ hasWebsite: true });
    expect(rows.find((b) => b.name === "Summit Roofing")!.websiteUrl).toContain("summitroofing.example");
    const leads = (await store.listLeads()).filter((l) => ALL.includes(l.business_name));
    expect(leads).toHaveLength(3);
    expect(leads.find((l) => l.business_name === "Summit Roofing")).toMatchObject({ website_found: true });
    expect(leads.find((l) => l.business_name === "Gutter Works Dallas")).toMatchObject({ website_found: false, check_no_real_website: true });
  }, 60000);

  it("skips what is already saved when run again (websites included), and does not count it or duplicate the leads", async () => {
    await run(20);
    const again = await run(20);
    expect(again).toMatchObject({ saved: 0, skippedDuplicate: 3, withWebsite: 0, withoutWebsite: 0, stopCode: "end_of_results", savedToday: 3 });
    expect(await names()).toHaveLength(3);
    expect((await store.listLeads()).filter((l) => ALL.includes(l.business_name))).toHaveLength(3);
  }, 60000);

  it("keeps the business and carries on when a lead can't be made, and counts the refusal", async () => {
    const r = await run(20, async () => ({ ok: false, message: "That business is already someone's lead." }));
    expect(r).toMatchObject({ saved: 3, leadsRefused: 3, stopCode: "end_of_results" });
    expect((await saved()).every((b) => b.movedLeadId === null)).toBe(true);
    expect((await store.listLeads()).filter((l) => ALL.includes(l.business_name))).toHaveLength(0);
  }, 60000);

  it("stops when today's saved count reaches the limit", async () => {
    const r = await run(1);
    expect(r).toMatchObject({ saved: 1, stopCode: "limit_reached", savedToday: 1 });
    expect(r.stopReason).toContain("1 of 1");
    expect(await names()).toHaveLength(1);
    const next = await run(1); // the same day, same limit: nothing may be saved
    expect(next).toMatchObject({ saved: 0, stopCode: "limit_reached", savedToday: 1 });
  }, 60000);

  it("counts earlier runs the same day against the limit", async () => {
    await run(1);
    const r = await run(2);
    expect(r).toMatchObject({ saved: 1, savedToday: 2, stopCode: "limit_reached" });
  }, 60000);

  it("stops at a CAPTCHA, keeps what it saved, and reports why", async () => {
    captchaOn = "Gutter+Works+Dallas";
    const r = await run(20);
    expect(r.stopCode).toBe("captcha");
    expect(r.stopReason).toMatch(/CAPTCHA/);
    expect(r.saved).toBe(2);
    expect(await names()).toHaveLength(2);
  }, 60000);
});

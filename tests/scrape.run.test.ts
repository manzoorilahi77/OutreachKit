// Runs the real scraper (Chromium + the file Store) against a stand-in Maps served from this machine, built from the saved fixtures.
// Skipped unless Playwright's Chromium is installed. It never contacts Google.
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runScrape, type ScrapeResult } from "@/lib/scrape/scraper";
import { localDay } from "@/lib/scrape/limits";
import type { FinderStore } from "@/lib/store/store";
import { seedTeam, tempRoot } from "./helpers/team";

const can = existsSync(chromium.executablePath());

const fx = (n: string) => readFileSync(`tests/fixtures/maps/${n}`, "utf8").replace(/<img[^>]*>/g, "");
const PLACES: Record<string, string> = { "Lone+Star+Roof+Pros": "no-website.html", "Gutter+Works+Dallas": "no-website-no-phone.html" };

describe.skipIf(!can)("scraper against a stand-in Maps", () => {
  let server: Server;
  let base = "";
  let captchaOn: string | null = null; // a place whose page is the "unusual traffic" page
  let finder: FinderStore;
  let cleanup: () => Promise<void>;
  let fresh: () => Promise<FinderStore>;

  beforeAll(async () => {
    const tmp = await tempRoot("okit-run-");
    cleanup = tmp.cleanup;
    let n = 0;
    // A new folder for every test, so each starts with nothing saved.
    fresh = async () => {
      const root = `${tmp.root}/t${++n}`;
      const t = await seedTeam(root);
      return t.ravi.finder();
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
    finder = await fresh();
  });

  const run = (limit: number): Promise<ScrapeResult> =>
    runScrape({ finder, category: "Roofing", city: "Dallas", state: "TX", limit, baseUrl: base, delayMs: () => 0 });
  const names = async () => (await finder.listBusinesses({ category: "Roofing", city: "Dallas", state: "TX" })).map((b) => b.name).reverse();

  it("saves the listings with no website, skips the one with a website, and records the run", async () => {
    const r = await run(20);
    expect(r).toMatchObject({ found: 3, checked: 3, saved: 2, noWebsite: 2, skippedHasWebsite: 1, skippedDuplicate: 0, stopCode: "end_of_results", savedToday: 2 });
    expect((await names()).sort()).toEqual(["Gutter Works Dallas", "Lone Star Roof Pros"]);
    const saved = (await finder.listBusinesses({ category: "Roofing", city: "Dallas", state: "TX" })).find((b) => b.name === "Lone Star Roof Pros")!;
    expect(saved).toMatchObject({ phone: "+1 214-555-0147", rating: 4.8, scrapedOn: localDay() });
  }, 60000);

  it("skips what is already saved when run again, and does not count it", async () => {
    await run(20);
    const again = await run(20);
    expect(again).toMatchObject({ saved: 0, skippedDuplicate: 2, skippedHasWebsite: 1, stopCode: "end_of_results", savedToday: 2 });
    expect(await names()).toHaveLength(2);
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
    expect(r.saved).toBe(1);
    expect(await names()).toHaveLength(1);
  }, 60000);
});

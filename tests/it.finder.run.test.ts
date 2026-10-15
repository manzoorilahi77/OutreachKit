// The IT finder: the real scraper (Chromium) saving into IT Prospects' own tables, against a stand-in Maps built from the saved
// fixtures. Never contacts Google. Skipped unless Playwright's Chromium is installed and MySQL is configured.
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { finderToInput } from "@/lib/it/fromFinder";
import { parseItRunRequest } from "@/lib/it/finderHttp";
import { runScrape } from "@/lib/scrape/scraper";
import { localDay } from "@/lib/scrape/limits";
import { mysqlBackend, mysqlConfigured } from "./contract/mysqlBackend";
import { seedCast } from "./helpers/team";

const hasChromium = existsSync(chromium.executablePath());
const fx = (n: string) => readFileSync(`tests/fixtures/maps/${n}`, "utf8").replace(/<img[^>]*>/g, "");
const PLACES: Record<string, string> = { "Summit+Roofing": "website.html", "Lone+Star+Roof+Pros": "no-website.html", "Gutter+Works+Dallas": "no-website-no-phone.html" };

describe("the IT finder's run request", () => {
  it("takes only IT categories", () => {
    expect(parseItRunRequest({ category: "Web design agencies", state: "tx", city: " Austin ", limit: 20 })).toEqual({ ok: true, value: { category: "Web design agencies", state: "TX", city: "Austin", limit: 20 } });
    expect(parseItRunRequest({ category: "Roofing", state: "TX", city: "Austin", limit: 20 })).toMatchObject({ ok: false });
    expect(parseItRunRequest({ category: "Web design agencies", state: "XX", city: "Austin", limit: 20 })).toMatchObject({ ok: false });
    expect(parseItRunRequest({ category: "Web design agencies", state: "TX", city: "Austin", limit: 7 })).toMatchObject({ ok: false });
  });
});

describe.skipIf(!hasChromium || !mysqlConfigured)("the IT finder against a stand-in Maps", () => {
  let server: Server;
  let base = "";
  let backend: Awaited<ReturnType<typeof mysqlBackend>>;
  let t: Awaited<ReturnType<typeof seedCast>>;

  beforeAll(async () => {
    backend = await mysqlBackend();
    t = await seedCast(backend);
    server = createServer((req, res) => {
      const path = decodeURIComponent((req.url ?? "").split("?")[0]!);
      const html = (body: string, status = 200) => { res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" }); res.end(`<!doctype html><html><body>${body}</body></html>`); };
      if (path.startsWith("/maps/search/")) {
        const feed = fx("feed-cards.html").split("https://www.google.com").join(base);
        return html(feed.replace(/<\/div>\s*$/, "<div>You’ve reached the end of the list.</div></div>"));
      }
      const place = Object.keys(PLACES).find((k) => path.includes("/maps/place/" + k.replace(/\+/g, " ")) || path.includes("/maps/place/" + k));
      if (place) return html(fx(PLACES[place]!));
      html("<p>not found</p>", 404);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60000);

  afterAll(async () => {
    server?.close();
    await backend?.cleanup();
  });

  const run = (store = t.ravi) => runScrape({ finder: store.it().finder(), category: "Web design agencies", city: "Dallas", state: "TX", limit: 20, baseUrl: base, delayMs: () => 0 });

  it("saves every listing into the IT finder, and nothing into the lead finder or the leads", async () => {
    const r = await run();
    expect(r.stopCode).toBe("end_of_results");
    expect(r.saved).toBe(3);
    const rows = await t.ravi.it().finder().listBusinesses({ category: "Web design agencies", city: "Dallas", state: "TX" });
    expect(rows.map((b) => b.name).sort()).toEqual(["Gutter Works Dallas", "Lone Star Roof Pros", "Summit Roofing"]);
    expect(await t.ravi.it().finder().countSavedOn(localDay())).toBe(3);
    expect(await t.ravi.finder().countSavedOn(localDay())).toBe(0);
    expect(await t.ravi.listLeads()).toEqual([]);
  }, 120000);

  it("skips what anyone already saved, and a prospect's place", async () => {
    const [summit] = (await t.ravi.it().finder().listBusinesses({ category: "Web design agencies", city: "Dallas", state: "TX" })).filter((b) => b.name === "Summit Roofing");
    const p = await t.ravi.it().createProspect(finderToInput(summit!), { source: "finder", finderBusinessId: summit!.id });
    expect(p).toMatchObject({ segment: "agency", source: "finder", company: "Summit Roofing" });
    const again = await run(t.asha);
    expect(again.saved).toBe(0);
    expect(again.skippedDuplicate).toBe(3);
  }, 120000);
});

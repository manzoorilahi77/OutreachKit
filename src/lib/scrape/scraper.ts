// The Google Maps lead finder. One Chromium, one tab, no other site: it searches Maps, scrolls the results, opens each
// listing that is not already saved (by anyone on the team) and saves every one it can read, with or without a website. Each saved
// business becomes a lead through `addLead`.
//
// Politeness: a random 2–5 s pause before each listing it opens; nothing is retried. A CAPTCHA, an "unusual traffic" page or a
// consent page that one normal click does not clear ends the run at once, with what was saved so far and the reason.
import { chromium, type Browser, type Page } from "playwright";
import type { FinderStore } from "../store/store";
import type { MoveResult } from "./addToLeads";
import { detectBlock, type Block } from "./blocks";
import { DailyBudget, localDay } from "./limits";
import { parseCards, parseListing, type Card } from "./parseListing";
import { cleanMapsUrl, placeKey } from "./placeKey";
import { BLOCK, SEL } from "./selectors";
import { COUNTRIES, countryOf, isRegion, placeLabel } from "../market/regions";
import { emptyCounters, progressLine, type BusinessRow, type Counters, type RunEvent, type StopCode } from "./types";

/** "Fencing & gates in Austin, TX"; outside the US the country is named too: "Dental practices in Business Bay, Dubai, UAE". */
export function searchQuery(category: string, city: string, st: string): string {
  if (!isRegion(st) || countryOf(st) === "US") return `${category} in ${city}, ${st}`;
  return `${category} in ${placeLabel(st, city)}, ${COUNTRIES[countryOf(st)].short}`;
}

/** A pause between listings, 2–5 s by default. `rnd` is injectable for tests. */
export const randomDelayMs = (min = 2000, max = 5000, rnd: () => number = Math.random) => Math.round(min + rnd() * (max - min));

export interface ScrapeOptions {
  /** Where results go and what is already known: the runner's own folder, plus a look at every folder's keys. */
  finder: FinderStore;
  category: string;
  city: string;
  state: string;
  limit: number;
  /** Show the browser window. Off by default. */
  headed?: boolean;
  /** Where Maps lives. Only tests change it, to point the scraper at a local stand-in. */
  baseUrl?: string;
  /** Milliseconds to wait before opening a listing. Only tests change it; the default is 2–5 s at random. */
  delayMs?: () => number;
  /** Turns a saved business into a lead. The run calls it right after each save; a refusal is counted and the run goes on. */
  addLead?: (b: BusinessRow) => Promise<MoveResult>;
  signal?: AbortSignal;
  onEvent?: (e: RunEvent) => void;
}

export interface ScrapeResult extends Counters {
  runId: string;
  stopCode: StopCode;
  stopReason: string;
  savedToday: number;
}

const MAX_SCROLLS = 60;
const MAX_CONSECUTIVE_FAILURES = 3;

class Stop extends Error {
  constructor(readonly code: StopCode, readonly reason: string) { super(reason); }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(done, ms);
    function done() { clearTimeout(t); signal?.removeEventListener("abort", done); resolve(); }
    signal?.addEventListener("abort", done, { once: true });
  });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const sameName = (a: string, b: string) => {
  const x = norm(a), y = norm(b);
  return !x || !y || x.includes(y) || y.includes(x);
};

async function blockOf(page: Page): Promise<Block | null> {
  const text = await page.evaluate(() => document.body?.innerText?.slice(0, 4000) ?? "").catch(() => "");
  const hasCaptchaFrame = (await page.locator(BLOCK.captchaFrame).count().catch(() => 0)) > 0;
  return detectBlock({ url: page.url(), text, hasCaptchaFrame });
}

async function failOnBlock(page: Page) {
  const b = await blockOf(page);
  if (b) {
    const advice = b.code === "consent" ? "" : " The run stopped and nothing was retried. Wait a while before running again.";
    throw new Stop(b.code, b.reason + advice);
  }
}

/** One normal click on the consent page's button. If the page is still a consent page afterwards, the run stops. */
async function clearConsent(page: Page) {
  if (!page.url().includes("consent.")) return;
  for (const sel of BLOCK.consentButtons) {
    const button = page.locator(sel).first();
    if (await button.count().catch(() => 0)) {
      await button.click({ timeout: 5000 }).catch(() => {});
      await page.waitForURL((u) => !u.href.includes("consent."), { timeout: 10000 }).catch(() => {});
      break;
    }
  }
}

export async function runScrape(o: ScrapeOptions): Promise<ScrapeResult> {
  const emit = o.onEvent ?? (() => {});
  const query = searchQuery(o.category, o.city, o.state);
  const day = localDay();
  const budget = new DailyBudget(await o.finder.countSavedOn(day), o.limit, day);
  const runId = await o.finder.startRun({ query, category: o.category, city: o.city, state: o.state, limit: o.limit });
  const c = emptyCounters();
  emit({ type: "start", runId, info: { query, limit: o.limit, day, savedToday: budget.saved } });

  const progress = () => emit({ type: "progress", ...c, savedToday: budget.saved, limit: o.limit, message: progressLine(c) });
  const aborted = () => o.signal?.aborted === true;

  async function search(page: Page): Promise<Card[]> {
    emit({ type: "status", message: `Searching Google Maps for “${query}”…` });
    await page.goto(`${o.baseUrl ?? "https://www.google.com"}/maps/search/${encodeURIComponent(query)}?hl=en`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await clearConsent(page);
    await failOnBlock(page);
    try {
      await page.waitForSelector(`${SEL.feed} ${SEL.cardLink}`, { timeout: 20000 });
    } catch {
      await failOnBlock(page);
      throw new Stop("no_results", `Maps showed no results list for “${query}”. Check the spelling, or Maps' layout may have changed (see src/lib/scrape/selectors.ts).`);
    }

    // Scroll the results until Maps says it is the end, stops giving more, or the safety cap is hit.
    let last = 0, idle = 0;
    for (let i = 0; i < MAX_SCROLLS; i++) {
      if (aborted()) throw new Stop("cancelled", "Stopped.");
      const n = await page.locator(`${SEL.feed} ${SEL.cardLink}`).count();
      const ended = await page.evaluate(([feed, text]) => document.querySelector(feed!)?.textContent?.includes(text!) ?? false, [SEL.feed, SEL.endOfList]);
      if (ended) break;
      idle = n === last ? idle + 1 : 0;
      last = n;
      if (idle >= 3) break;
      emit({ type: "status", message: `Loading results… ${n} so far` });
      await page.evaluate((feed) => { const f = document.querySelector(feed); f?.scrollTo(0, f.scrollHeight); }, SEL.feed);
      await sleep(1200 + Math.random() * 800, o.signal);
      if (i % 4 === 3) await failOnBlock(page);
    }

    const html = await page.evaluate((feed) => document.querySelector(feed)?.outerHTML ?? "", SEL.feed);
    const seen = new Set<string>();
    return parseCards(html).filter((card) => {
      const key = placeKey(card.href);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function work(page: Page): Promise<Stop> {
    const cards = await search(page);
    c.found = cards.length;
    if (!cards.length) throw new Stop("no_results", `Maps listed nothing for “${query}”.`);
    emit({ type: "status", message: `${cards.length} listings found. Checking them…` });
    const known = await o.finder.existingPlaceKeys(cards.map((card) => placeKey(card.href)!));

    let opened = 0, failures = 0;
    for (const card of cards) {
      if (aborted()) throw new Stop("cancelled", "Stopped.");
      if (budget.reached) throw new Stop("limit_reached", `Today's limit reached: ${budget.saved} of ${o.limit} saved.`);
      if (budget.rolledOver()) throw new Stop("day_changed", "The date changed during the run, so today's count no longer applies. Start a new run.");
      const key = placeKey(card.href)!;
      c.checked++;

      if (known.has(key)) { c.skippedDuplicate++; progress(); continue; }

      if (opened++ > 0) await sleep((o.delayMs ?? randomDelayMs)(), o.signal);
      if (aborted()) throw new Stop("cancelled", "Stopped.");

      let html = "";
      try {
        await page.goto(card.href, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector(SEL.name, { timeout: 15000 });
        await page.waitForSelector(SEL.panelReady, { timeout: 6000 }).catch(() => {});
        await sleep(700, o.signal);
        await failOnBlock(page);
        html = await page.evaluate((panel) => document.querySelector(panel)?.outerHTML ?? "", SEL.panel);
      } catch (e) {
        if (e instanceof Stop) throw e;
        if (aborted()) throw new Stop("cancelled", "Stopped.");
        await failOnBlock(page); // a CAPTCHA page also looks like a timeout
        html = "";
      }

      const listing = html ? parseListing(html) : null;
      if (!listing || !sameName(listing.name, card.name)) {
        c.unreadable++;
        progress();
        if (++failures >= MAX_CONSECUTIVE_FAILURES)
          throw new Stop("unresponsive", `${failures} listings in a row could not be read. Maps may have changed its layout (see src/lib/scrape/selectors.ts) or stopped responding.`);
        continue;
      }
      failures = 0;

      const id = await o.finder.insertBusiness({
        placeKey: key, scrapedOn: day, runId, query, category: o.category, city: o.city, state: o.state,
        name: listing.name, phone: listing.phone, address: listing.address, mapsCategory: listing.mapsCategory,
        rating: listing.rating, reviewCount: listing.reviewCount, email: listing.email, facebookUrl: listing.facebookUrl,
        instagramUrl: listing.instagramUrl, otherLinks: listing.otherLinks, mapsUrl: cleanMapsUrl(card.href),
        hasWebsite: listing.hasWebsite, websiteUrl: listing.websiteUrl, whatsapp: listing.whatsapp,
      });
      if (id === null) { c.skippedDuplicate++; progress(); continue; } // another run saved it a moment ago
      budget.record();
      c.saved++;
      if (listing.hasWebsite) c.withWebsite++; else c.withoutWebsite++;
      let business = await o.finder.getBusiness(id);
      if (business && o.addLead) {
        const made = await o.addLead(business).catch((): MoveResult => ({ ok: false, message: "The lead couldn't be saved." }));
        if (made.ok) business = { ...business, movedLeadId: made.leadId };
        else c.leadsRefused++;
      }
      if (business) emit({ type: "saved", business });
      progress();
    }
    if (budget.reached) return new Stop("limit_reached", `Today's limit reached: ${budget.saved} of ${o.limit} saved.`);
    return new Stop("end_of_results", `Reached the end of the results (${cards.length} listings).`);
  }

  let stop: Stop;
  let browser: Browser | null = null;
  const onAbort = () => { void browser?.close().catch(() => {}); };
  o.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (budget.reached) throw new Stop("limit_reached", `Today's limit is already reached: ${budget.saved} of ${o.limit} saved.`);
    browser = await chromium.launch({ headless: !o.headed });
    const page = await (await browser.newContext({ locale: "en-US", viewport: { width: 1280, height: 900 } })).newPage();
    stop = await work(page);
  } catch (e) {
    if (e instanceof Stop) stop = e;
    else if (aborted()) stop = new Stop("cancelled", "Stopped.");
    else {
      const msg = e instanceof Error ? e.message : String(e);
      stop = new Stop(
        "error",
        /Executable doesn't exist|browserType\.launch/.test(msg)
          ? "Chromium isn't installed for Playwright. Run: pnpm exec playwright install chromium"
          : `The run failed: ${msg.split("\n")[0]}`,
      );
    }
  } finally {
    o.signal?.removeEventListener("abort", onAbort);
    await browser?.close().catch(() => {});
  }

  await o.finder.finishRun(runId, { found: c.found, checked: c.checked, skippedHasWebsite: 0, skippedDuplicate: c.skippedDuplicate, saved: c.saved }, stop.reason).catch(() => {});
  const result: ScrapeResult = { ...c, runId, stopCode: stop.code, stopReason: stop.reason, savedToday: budget.saved };
  emit({ type: "done", ...result, limit: o.limit });
  return result;
}

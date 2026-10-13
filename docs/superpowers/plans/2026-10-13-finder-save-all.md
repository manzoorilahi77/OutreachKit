# Lead finder: save everything as leads, website tabs, Leads filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Google Maps lead finder saves every business it finds (with or without a website) and creates the lead itself; its results show in "Without website" / "With website" tabs; the Leads page gets State, City and Category filters.

**Architecture:** Keep `finder_businesses` as the finder's store (team-wide duplicate guard, daily count, results list) and add `has_website` / `website_url`. A new `addBusinessToLeads(store, id)` function (extracted from today's `moveToLeads` action) turns a saved business into a lead; the scraper calls it through an injected `addLead` callback right after each save. The finder UI splits `BusinessRow[]` by `hasWebsite` into two tabs. The Leads page filters through a small pure module, `src/lib/leads/placeFilters.ts`.

**Tech Stack:** Next.js (app router, server actions), React, TypeScript, MySQL 8 (`mysql2`), Playwright (scraper), Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-13-finder-save-all-design.md`

## Global Constraints

- Port guard: do not edit `generateKit`, `openers`, `messages`, `buildPromptText`, `src/data`, `src/content`, `SEQUENCE`, `applyCategoryKit`, `src/kits/*.json`. `pnpm parity` and `pnpm golden:sweep` must show no changes; do not edit `scripts/changes.ts` / `CHANGES.md`.
- Never edit a migration that has run: the schema change is a new numbered file, `db/migrations/0002_finder_website.sql`.
- Pages call `requirePerm()`, server actions `checkPerm()`; code asks `can(session, "...")`. Only `src/lib/store/` touches stored data; both `mysqlStore.ts` and `fileStore.ts` must pass `tests/contract/storeContract.ts`.
- Brand: four colours, Jost 400/500, no `<b>`, Electric Blue never for small text. `pnpm brand` must pass. Accessible tabs (tablist, arrow keys, `aria-selected`, `role="tabpanel"`).
- Scripts are Node (`tsx`), `path.join` everywhere. Never print or commit a secret; `.env*` and `.local/` are never committed.
- Local port is always 5021. MySQL tests need the local MySQL on :3307 (`~/.outreachkit-mysql/start.sh`) and a DB user with CREATE/DROP on `okit_%`.
- The working tree already holds a lot of uncommitted work from the MySQL migration. **Every commit in this plan stages explicit paths only (never `git add -A` or `git add .`).**
- Run single test files with `pnpm exec vitest run <file>`. `tests/scrape.run.test.ts` is skipped unless Playwright's Chromium is installed (`pnpm exec playwright install chromium`); install it before Task 3 so that test really runs.

## Review Focus

Failure modes the spec implies but a happy-path test would miss, most likely first:

1. **Lead creation is refused** (validation, a race with another run, an actor who can't add leads): the business must stay saved and unmoved, the run must continue, and the refusal must be counted. Tested in Task 3 (run test with a refusing `addLead`).
2. **Rows saved before this change** have no website fields: both stores must read them as "no website" and the UI must still offer "Add to leads" for them. Tested in Task 1 (file store legacy line) and Task 4 (tab split / button rule helpers).
3. **A city name shared by two states** (e.g. Portland, OR and Portland, ME): the City options must narrow to the chosen state, and a URL carrying a city that doesn't exist under the chosen state must show "No leads match those filters." with a working Clear filters, not crash. Tested in Task 5.
4. **Leads with an empty category or empty state**: they must not break the options or the matching (no empty `<option>`, no `undefined.toUpperCase()`). Tested in Task 5.
5. **Re-running the same search** now meets many saved businesses with websites: they must count as already saved (skippedDuplicate), not be saved or turned into leads twice. Tested in Task 3.

---

### Task 1: Website fields in the data model (migration, types, both stores)

**Files:**
- Create: `db/migrations/0002_finder_website.sql`
- Modify: `src/lib/store/types.ts:179-200` (`FinderBusiness`), `src/lib/store/store.ts:50-54` (`NewBusiness`), `src/lib/scrape/types.ts` (`BusinessRow`), `src/lib/store/mysqlStore.ts` (`businessOf`, `insertBusiness`), `src/lib/store/fileStore.ts` (`row`, `insertBusiness`), `src/lib/store/teamImport.ts` (finder business INSERT), `src/lib/scrape/scraper.ts` (pass the fields through)
- Test: `tests/contract/storeContract.ts`, `tests/store.test.ts`, `tests/teamImport.test.ts`

**Interfaces:**
- Consumes: `ParsedListing.hasWebsite: boolean`, `ParsedListing.websiteUrl: string` (already exist).
- Produces: `NewBusiness` and `BusinessRow` both gain `hasWebsite: boolean; websiteUrl: string`. `FinderBusiness` (file lines) gains them as optional so old lines still validate. Both stores' `getBusiness` / `listBusinesses` return rows with `hasWebsite` / `websiteUrl` always present (`false` / `""` for old rows).

- [ ] **Step 1: Make sure MySQL is up**

Run: `~/.outreachkit-mysql/start.sh` then `pnpm exec vitest run tests/mysqlStore.test.ts`
Expected: PASS (not skipped). If it is skipped, the DB env in `.env.local` is wrong; fix that before going on.

- [ ] **Step 2: Write the failing tests**

In `tests/contract/storeContract.ts`, change the `biz` helper (around line 290) so the defaults include the new fields, and add a test after "saves to the runner's folder…":

```ts
      const biz = (over: Partial<Parameters<ReturnType<typeof t.ravi.finder>["insertBusiness"]>[0]> = {}) => ({
        placeKey: "fid:0x1:0x2", scrapedOn: "2026-10-12", runId: null, query: "Roofing in Dallas, TX", category: "Roofing", city: "Dallas", state: "TX",
        name: "Finder Roofing", phone: "2145559001", address: "1 Main St", mapsCategory: "Roofing contractor", rating: 4.5, reviewCount: 12, email: "", facebookUrl: "",
        instagramUrl: "", otherLinks: [], mapsUrl: "https://www.google.com/maps/place/Finder", hasWebsite: false, websiteUrl: "", ...over,
      });
```

```ts
      it("keeps whether the listing showed a website, and its address", async () => {
        const f = t.ravi.finder();
        const withSite = await f.insertBusiness(biz({ placeKey: "fid:0x7:0x8", name: "Webbed Roofing", phone: "2145559002", hasWebsite: true, websiteUrl: "https://webbed.example/" }));
        const without = await f.insertBusiness(biz());
        expect(await f.getBusiness(withSite!)).toMatchObject({ hasWebsite: true, websiteUrl: "https://webbed.example/" });
        expect(await f.getBusiness(without!)).toMatchObject({ hasWebsite: false, websiteUrl: "" });
        const listed = await f.listBusinesses({ category: "Roofing", city: "Dallas", state: "TX" });
        expect(listed.map((b) => [b.name, b.hasWebsite]).sort()).toEqual([["Finder Roofing", false], ["Webbed Roofing", true]]);
      });
```

In `tests/store.test.ts` (the "keeps finder rows and runs as lines" test) add `hasWebsite: false, websiteUrl: ""` after `mapsUrl: ...`, and add a new test below it for a legacy line:

```ts
  it("reads a finder line written before the website fields existed as 'no website'", async () => {
    const f = t.ravi.finder();
    const id = await f.insertBusiness({
      placeKey: "fid:0x5:0x6", scrapedOn: "2026-10-12", runId: null, query: "Roofing in Dallas, TX", category: "Roofing", city: "Dallas", state: "TX",
      name: "Old Roofing", phone: "2145559003", address: "", mapsCategory: "", rating: null, reviewCount: null, email: "", facebookUrl: "",
      instagramUrl: "", otherLinks: [], mapsUrl: "https://www.google.com/maps/place/Old", hasWebsite: false, websiteUrl: "",
    });
    const file = path.join(root, "team/data/ravi/finder/businesses.jsonl");
    const rewritten = (await readFile(file, "utf8")).split("\n").filter(Boolean).map((l) => {
      const o = JSON.parse(l);
      delete o.hasWebsite; delete o.websiteUrl;
      return JSON.stringify(o);
    }).join("\n") + "\n";
    await writeFile(file, rewritten);
    expect(await t.ravi.finder().getBusiness(id!)).toMatchObject({ hasWebsite: false, websiteUrl: "" });
  });
```

Add `writeFile` to the `node:fs/promises` import at the top of `tests/store.test.ts` if it isn't imported. In `tests/teamImport.test.ts` add `hasWebsite: false, websiteUrl: "",` into the `biz` default object (line ~15, after `mapsUrl`).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/store.contract.test.ts tests/store.test.ts tests/mysqlStore.test.ts tests/teamImport.test.ts`
Expected: FAIL — the new contract test and the legacy-line test (`hasWebsite` is `undefined`; MySQL errors on the unknown field is not raised but the value is missing).

- [ ] **Step 4: Migration**

Create `db/migrations/0002_finder_website.sql`:

```sql
-- The lead finder now keeps every business it finds, with or without a website.
-- Rows saved before this migration all had no website, which is what the default says.
ALTER TABLE finder_businesses
  ADD COLUMN has_website TINYINT(1) NOT NULL DEFAULT 0 AFTER maps_url,
  ADD COLUMN website_url VARCHAR(1000) NOT NULL DEFAULT '' AFTER has_website;
```

- [ ] **Step 5: Types**

`src/lib/store/types.ts`, in `FinderBusiness` after `mapsUrl: string;`:

```ts
  /** Absent on lines written before the finder kept businesses with a website: read as false and "". */
  hasWebsite?: boolean;
  websiteUrl?: string;
```

`src/lib/store/store.ts`, `NewBusiness`: add a line inside the interface

```ts
  hasWebsite: boolean; websiteUrl: string;
```

`src/lib/scrape/types.ts`, `BusinessRow`: after `mapsUrl: string;` add

```ts
  hasWebsite: boolean;
  websiteUrl: string;
```

- [ ] **Step 6: MySQL store**

In `src/lib/store/mysqlStore.ts`, `businessOf`: change the last line to

```ts
  mapsUrl: r.maps_url, movedLeadId: r.moved_lead_id, hasWebsite: !!r.has_website, websiteUrl: r.website_url ?? "",
});
```

and in `insertBusiness` replace the `INSERT INTO finder_businesses …` statement with (23 columns, 23 placeholders):

```ts
            await exec(c, `INSERT INTO finder_businesses (id, owner, place_key, scraped_on, scraped_at, run_id, query, category, city, state, name, phone, address, maps_category,
              rating, review_count, email, facebook_url, instagram_url, other_links, maps_url, has_website, website_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, me, b.placeKey.slice(0, 512), b.scrapedOn, toDbTime(nowIso()), b.runId, b.query.slice(0, 300), b.category, b.city, b.state, b.name.slice(0, 255), b.phone.slice(0, 60),
              b.address.slice(0, 500), b.mapsCategory.slice(0, 200), b.rating, b.reviewCount, b.email.slice(0, 255), b.facebookUrl.slice(0, 500), b.instagramUrl.slice(0, 500),
              JSON.stringify(b.otherLinks), b.mapsUrl.slice(0, 1000), b.hasWebsite ? 1 : 0, b.websiteUrl.slice(0, 1000)]);
```

- [ ] **Step 7: File store**

In `src/lib/store/fileStore.ts`, `finder().row`:

```ts
    const row = (b: FinderBusiness & { movedLeadId: string | null; owner: string }): BusinessRow => {
      const { runId: _r, owner: _o, ...rest } = b;
      void _r; void _o;
      return { ...rest, hasWebsite: b.hasWebsite ?? false, websiteUrl: b.websiteUrl ?? "" };
    };
```

and in `insertBusiness`, the `line` object gains the two fields after `mapsUrl: b.mapsUrl.slice(0, 1000),`:

```ts
            hasWebsite: b.hasWebsite, websiteUrl: b.websiteUrl.slice(0, 1000),
```

- [ ] **Step 8: Team import**

In `src/lib/store/teamImport.ts` replace the finder business INSERT (the `for (const b of [...src.businesses]…` block's `put(...)`) with:

```ts
      const inserted = await put("finder businesses", `finder business ${b.id} (${b.owner})`,
        `INSERT INTO finder_businesses (id, owner, place_key, scraped_on, scraped_at, run_id, query, category, city, state, name, phone, address, maps_category, rating, review_count, email,
          facebook_url, instagram_url, other_links, maps_url, has_website, website_url, moved_lead_id, moved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.owner, b.placeKey, b.scrapedOn, toDbTime(b.scrapedAt), b.runId, b.query, b.category, b.city, b.state, b.name, b.phone, b.address, b.mapsCategory, b.rating, b.reviewCount,
          b.email, b.facebookUrl, b.instagramUrl, JSON.stringify(b.otherLinks), b.mapsUrl, b.hasWebsite ? 1 : 0, (b.websiteUrl ?? "").slice(0, 1000), b.movedLeadId, b.movedAt ? toDbTime(b.movedAt) : null]);
```

- [ ] **Step 9: Scraper pass-through (so the tree typechecks; the real scraper change is Task 3)**

In `src/lib/scrape/scraper.ts`, in the `insertBusiness({ … })` call add after `mapsUrl: cleanMapsUrl(card.href),`:

```ts
        hasWebsite: listing.hasWebsite, websiteUrl: listing.websiteUrl,
```

- [ ] **Step 10: Run tests and typecheck**

Run: `pnpm exec vitest run tests/store.contract.test.ts tests/store.test.ts tests/mysqlStore.test.ts tests/teamImport.test.ts tests/scrape.parse.test.ts` then `pnpm typecheck`
Expected: PASS, and typecheck reports errors only in `tests/scrape.leadmap.test.ts` (its `row` lacks the new fields; fixed in Task 2). If typecheck shows anything else, fix it now.

- [ ] **Step 11: Commit**

```bash
git add db/migrations/0002_finder_website.sql src/lib/store/types.ts src/lib/store/store.ts src/lib/scrape/types.ts src/lib/store/mysqlStore.ts src/lib/store/fileStore.ts src/lib/store/teamImport.ts src/lib/scrape/scraper.ts tests/contract/storeContract.ts tests/store.test.ts tests/teamImport.test.ts
git commit -m "feat(finder): store whether a business has a website

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Business → lead mapping and a shared "add to leads" function

**Files:**
- Create: `src/lib/scrape/addToLeads.ts`
- Modify: `src/lib/scrape/leadMap.ts`, `src/components/scrape/actions.ts`
- Test: `tests/scrape.leadmap.test.ts`

**Interfaces:**
- Consumes: `BusinessRow` with `hasWebsite` / `websiteUrl` (Task 1); `Store` from `@/lib/store/store`.
- Produces: `export type MoveResult = { ok: true; leadId: string } | { ok: false; message: string }` and `export async function addBusinessToLeads(store: Store, businessId: string, today?: string): Promise<MoveResult>` in `src/lib/scrape/addToLeads.ts`. `moveToLeads` (server action, unchanged signature) re-exports the `MoveResult` type from there.

- [ ] **Step 1: Write the failing tests**

In `tests/scrape.leadmap.test.ts`: add `hasWebsite: false, websiteUrl: "",` to `row` (after `movedLeadId: null,`). Then add:

```ts
describe("a business with a website", () => {
  const withSite: BusinessRow = { ...row, hasWebsite: true, websiteUrl: "https://lonestarroofpros.example/" };

  it("says a website was found, keeps its address, and does not tick the no-website check", () => {
    const parsed = parseLeadForm(businessToLeadForm(withSite, "2026-10-09"));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({ website_found: true, website_url: "https://lonestarroofpros.example/" });
    expect(parsed.value.checks.check_no_real_website).toBe(false);
    expect(Object.values(parsed.value.checks).some(Boolean)).toBe(false);
  });

  it("words the notes without claiming there is no website", () => {
    const notes = businessToLeadFields(withSite, "2026-10-09").notes!;
    expect(notes).toContain("Found with the Google Maps lead finder on 2026-10-09");
    expect(notes).not.toContain("no website");
  });

  it("keeps a very long website address valid", () => {
    const long = { ...withSite, websiteUrl: "https://example.com/" + "a".repeat(900) };
    expect(parseLeadForm(businessToLeadForm(long, "2026-10-09")).ok).toBe(true);
  });
});
```

(`row` without a website still must give `website_found: false` and the check — existing tests keep covering that.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run tests/scrape.leadmap.test.ts`
Expected: FAIL (`website_found` is `false`, `checks.check_no_real_website` is `true` for the website row).

- [ ] **Step 3: Update `leadMap.ts`**

Replace the header comment's last sentence area and the two functions. Full new content of the relevant parts:

```ts
/** The lead's notes: what the leads table has no column for. */
export function leadNotes(b: BusinessRow, today: string): string {
  const lines: string[] = [];
  if (b.address) lines.push(`Address: ${b.address}`);
  if (b.mapsCategory) lines.push(`Maps category: ${b.mapsCategory}`);
  if (b.instagramUrl && !instagramHandle(b.instagramUrl)) lines.push(`Instagram: ${b.instagramUrl}`);
  for (const l of b.otherLinks) lines.push(`${l.label}: ${l.url}`);
  lines.push(`Found with the Google Maps lead finder on ${today}${b.hasWebsite ? " (the listing shows a website)." : " (no website shown on the listing)."}`);
  return lines.join("\n");
}

/**
 * The fields createLead's form would post for this business. With no website, website_found is "no" and the no-real-website
 * check is on; with one, website_found is "yes", the address goes in website_url and no check is ticked.
 */
export function businessToLeadFields(b: BusinessRow, today: string): Record<string, string> {
  return {
    date_sourced: today,
    business_name: b.name,
    category: b.category,
    city: b.city,
    state: b.state,
    phone: b.phone,
    email: b.email,
    instagram_handle: instagramHandle(b.instagramUrl),
    facebook_page: b.facebookUrl,
    google_maps_url: b.mapsUrl,
    google_rating: b.rating === null ? "" : String(b.rating),
    google_review_count: b.reviewCount === null ? "" : String(b.reviewCount),
    website_found: b.hasWebsite ? "yes" : "no",
    website_url: b.hasWebsite ? b.websiteUrl : "",
    ...(b.hasWebsite ? {} : { check_no_real_website: "on" }),
    notes: leadNotes(b, today),
  };
}
```

(`businessToLeadForm` is unchanged.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run tests/scrape.leadmap.test.ts` — Expected: PASS.

- [ ] **Step 5: Extract `addBusinessToLeads`**

Create `src/lib/scrape/addToLeads.ts`:

```ts
// Copies one saved finder business into the acting person's leads and marks it as moved. Used by the finder run (right after each
// save) and by the "Add to leads" button. The fields go through parseLeadForm, the same validation as createLead in
// src/app/leads/actions.ts, and the duplicate block applies: a business that is already someone's lead is refused with the holder's name.
import { parseLeadForm } from "@/lib/leads/form";
import { StoreError } from "@/lib/store/errors";
import type { Store } from "@/lib/store/store";
import { localDay } from "./limits";
import { businessToLeadForm } from "./leadMap";

export type MoveResult = { ok: true; leadId: string } | { ok: false; message: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function addBusinessToLeads(store: Store, businessId: string, today?: string): Promise<MoveResult> {
  if (typeof businessId !== "string" || !businessId) return { ok: false, message: "That business wasn't found." };

  const finder = store.finder();
  const business = await finder.getBusiness(businessId);
  if (!business) return { ok: false, message: "That business wasn't found." };
  if (business.movedLeadId) return { ok: false, message: "That business is already in your leads." };

  const parsed = parseLeadForm(businessToLeadForm(business, typeof today === "string" && ISO.test(today) ? today : localDay()));
  if (!parsed.ok) return { ok: false, message: parsed.error };

  let lead;
  try {
    lead = await store.createLead(parsed.value);
  } catch (e) {
    return { ok: false, message: e instanceof StoreError ? e.message : "We couldn't save the lead. Try again." };
  }
  if (!(await finder.markMoved(businessId, lead.id))) {
    // Someone moved it a moment ago: do not leave a second copy behind.
    await store.deleteLead(lead.id);
    return { ok: false, message: "That business was already moved. Nothing was added." };
  }
  return { ok: true, leadId: lead.id };
}
```

Replace `src/components/scrape/actions.ts` with:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { checkPerm } from "@/lib/auth/server";
import { addBusinessToLeads, type MoveResult } from "@/lib/scrape/addToLeads";

export type { MoveResult };

/**
 * "Add to leads" for a saved business that has no lead yet (saved before the finder made leads itself, or refused when the run
 * tried). The finder run makes leads on its own; this is the manual fallback.
 */
export async function moveToLeads(businessId: string, today?: string): Promise<MoveResult> {
  const c = await checkPerm("finder.run");
  if (!c.ok) return { ok: false, message: c.message };
  const result = await addBusinessToLeads(c.store, businessId, today);
  if (result.ok) revalidatePath("/leads");
  return result;
}
```

Note: a `"use server"` file may only export async functions; `export type` is erased at compile time so it is allowed (the old file already exported the `MoveResult` type).

- [ ] **Step 6: Typecheck and run the scrape tests**

Run: `pnpm typecheck && pnpm exec vitest run tests/scrape.leadmap.test.ts`
Expected: PASS, typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scrape/leadMap.ts src/lib/scrape/addToLeads.ts src/components/scrape/actions.ts tests/scrape.leadmap.test.ts
git commit -m "feat(finder): map websites onto leads and share the add-to-leads function

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The scraper saves everything and makes the leads

**Files:**
- Modify: `src/lib/scrape/types.ts` (counters, `progressLine`), `src/lib/scrape/scraper.ts`, `src/lib/scrape/limits.ts` (comment), `src/app/api/leadfinder/run/route.ts`, `scripts/scrape.ts`
- Test: `tests/scrape.run.test.ts`, `tests/scrape.http.test.ts`, `tests/scrape.limit.test.ts`

**Interfaces:**
- Consumes: `addBusinessToLeads`, `MoveResult` (Task 2).
- Produces: `Counters` becomes `{ found, checked, saved, withWebsite, withoutWebsite, skippedDuplicate, unreadable, leadsRefused }` (`noWebsite` and `skippedHasWebsite` are removed). `ScrapeOptions.addLead?: (b: BusinessRow) => Promise<MoveResult>`. The `saved` run event's `business` carries `movedLeadId` when the lead was made. `progressLine` reads `Checked N · saved N · with website X · without website Y` plus `· N already saved`, `· N unreadable`, `· N not added to leads` when non-zero.

- [ ] **Step 1: Install Chromium so the run test actually runs**

Run: `pnpm exec playwright install chromium` then `pnpm exec vitest run tests/scrape.run.test.ts`
Expected: the 5 existing tests run (PASS before our change; they are not skipped).

- [ ] **Step 2: Update the unit tests first**

`tests/scrape.limit.test.ts`, replace the `progressLine` assertions:

```ts
    expect(progressLine({ ...emptyCounters(), checked: 23, saved: 7, withWebsite: 5, withoutWebsite: 2 })).toBe(
      "Checked 23 · saved 7 · with website 5 · without website 2",
    );
    expect(progressLine({ ...emptyCounters(), checked: 5, skippedDuplicate: 2, unreadable: 1, leadsRefused: 3 })).toBe(
      "Checked 5 · saved 0 · with website 0 · without website 0 · 2 already saved · 1 unreadable · 3 not added to leads",
    );
```

`tests/scrape.http.test.ts`, the progress event:

```ts
    { type: "progress", found: 40, checked: 23, saved: 7, withWebsite: 5, withoutWebsite: 2, skippedDuplicate: 0, unreadable: 0, leadsRefused: 0, savedToday: 7, limit: 20, message: "Checked 23 · saved 7 · with website 5 · without website 2" },
```

`tests/scrape.run.test.ts` — rewrite as follows (keeps the stand-in Maps server; adds the website listing, a real store, and the lead assertions):

```ts
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
```

If a `listLeads()` item turns out not to carry `website_found` / `check_no_real_website` (it is a `LeadView`), assert through `store.getLead(...)` instead — look at `LeadView` in `src/lib/store/types.ts` and adjust only those two `toMatchObject` calls.

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm exec vitest run tests/scrape.limit.test.ts tests/scrape.http.test.ts tests/scrape.run.test.ts`
Expected: FAIL (counters and `addLead` don't exist yet).

- [ ] **Step 4: Counters and progress line (`src/lib/scrape/types.ts`)**

Replace the `Counters` interface, `emptyCounters` and `progressLine`:

```ts
export interface Counters {
  /** Listings seen in the results. */
  found: number;
  /** Listings looked at: opened, or recognised as already saved. */
  checked: number;
  /** Businesses saved this run, with or without a website. */
  saved: number;
  withWebsite: number;
  withoutWebsite: number;
  skippedDuplicate: number;
  /** Opened listings the parser could not read, or that failed to load. */
  unreadable: number;
  /** Saved businesses the run could not turn into a lead (they stay in the list, with an "Add to leads" button). */
  leadsRefused: number;
}
```

```ts
export const emptyCounters = (): Counters => ({ found: 0, checked: 0, saved: 0, withWebsite: 0, withoutWebsite: 0, skippedDuplicate: 0, unreadable: 0, leadsRefused: 0 });

/** "Checked 23 · saved 7 · with website 5 · without website 2" */
export function progressLine(c: Counters): string {
  const parts = [`Checked ${c.checked}`, `saved ${c.saved}`, `with website ${c.withWebsite}`, `without website ${c.withoutWebsite}`];
  if (c.skippedDuplicate) parts.push(`${c.skippedDuplicate} already saved`);
  if (c.unreadable) parts.push(`${c.unreadable} unreadable`);
  if (c.leadsRefused) parts.push(`${c.leadsRefused} not added to leads`);
  return parts.join(" · ");
}
```

Also change the comment above `BusinessRow` to "One saved business, as the UI and the Add to leads action see it."

- [ ] **Step 5: Scraper (`src/lib/scrape/scraper.ts`)**

(a) Update the header comment: replace "…and not already known to have a website, and saves the ones that show no website." with "and saves every one it can read, with or without a website. Each saved business becomes a lead through `addLead`."

(b) `ScrapeOptions`: add before `signal`:

```ts
  /** Turns a saved business into a lead. The run calls it right after each save; a refusal is counted and the run goes on. */
  addLead?: (b: BusinessRow) => Promise<MoveResult>;
```

and the imports `import type { MoveResult } from "./addToLeads";` and `BusinessRow` added to the `./types` import.

(c) In `work()`, delete the line

```ts
      if (card.hasWebsiteButton) { c.skippedHasWebsite++; progress(); continue; }
```

(d) Delete the two lines

```ts
      if (listing.hasWebsite) { c.skippedHasWebsite++; progress(); continue; }
      c.noWebsite++;
```

(e) Replace the part from `if (id === null)` through `if (business) emit(...)` with:

```ts
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
```

(the existing trailing `progress();` right after `emit` is replaced by the one above — make sure there is exactly one).

(f) `finishRun` call: `skippedHasWebsite: 0` instead of `c.skippedHasWebsite`:

```ts
  await o.finder.finishRun(runId, { found: c.found, checked: c.checked, skippedHasWebsite: 0, skippedDuplicate: c.skippedDuplicate, saved: c.saved }, stop.reason).catch(() => {});
```

(g) `src/lib/scrape/parseListing.ts` comment on `Card.hasWebsiteButton` stays true ("a shortcut only") but the scraper no longer uses it; leave the type, and change the doc comment to "…is no longer used to skip a card: every card not already saved is opened, because the card doesn't show the phone, address or links."

- [ ] **Step 6: Wire the callers**

`src/app/api/leadfinder/run/route.ts`: add imports `import { revalidatePath } from "next/cache";` and `import { addBusinessToLeads } from "@/lib/scrape/addToLeads";`, then change the `runScrape` call and the `finally`:

```ts
        const store = c.store;
        await runScrape({
          finder: store.finder(), category: v.category, city: v.city, state: v.state, limit: v.limit, signal: ac.signal,
          addLead: (b) => addBusinessToLeads(store, b.id),
          headed: process.env.SCRAPE_HEADED === "1",
          onEvent: (e) => send(sseFrame(e)),
        });
      } catch {
        send(sseFrame({ type: "failed", message: "The run couldn't save to the database." }));
      } finally {
        g.__leadfinderRunning = false;
        try { revalidatePath("/leads"); } catch { /* not in a request scope */ }
        try { controller.close(); } catch { /* already closed */ }
      }
```

Update the file's header comment to "Results are saved to the signed-in person's finder list and each one becomes a lead."

`scripts/scrape.ts`: the store is built once; reuse it:

```ts
const store = createStore({ username: user.username, role: user.role, team: user.team });
const finder = store.finder();
```
and in the `runScrape({...})` call add `addLead: (b) => addBusinessToLeads(store, b.id),` with `import { addBusinessToLeads } from "../src/lib/scrape/addToLeads";`. Update its header comment to "Finds businesses on Google Maps, with or without a website, saves them to that person's finder list in the database and adds each as a lead."; the `saved` log line becomes `` `  + ${e.business.name}${e.business.hasWebsite ? " (website)" : ""}${e.business.phone ? " · " + e.business.phone : ""}` ``.

`src/lib/scrape/limits.ts` header comment: "a ceiling on NEW businesses saved per calendar day (local time), with or without a website, counted from MySQL."

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm typecheck && pnpm exec vitest run tests/scrape.limit.test.ts tests/scrape.http.test.ts tests/scrape.run.test.ts tests/scrape.parse.test.ts tests/scrape.leadmap.test.ts`
Expected: all PASS (the run tests really execute Chromium, ~1 min). `pnpm typecheck` may still flag `src/components/scrape/LeadFinder.tsx` only if it reads removed fields — it doesn't; if it reports errors there, they belong to Task 4 and must be zero after it.

- [ ] **Step 8: Commit**

```bash
git add src/lib/scrape/types.ts src/lib/scrape/scraper.ts src/lib/scrape/limits.ts src/lib/scrape/parseListing.ts src/app/api/leadfinder/run/route.ts scripts/scrape.ts tests/scrape.run.test.ts tests/scrape.http.test.ts tests/scrape.limit.test.ts
git commit -m "feat(finder): save every business and add each as a lead

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Finder results in two tabs

**Files:**
- Create: `src/components/scrape/WebsiteTabs.tsx`, `src/lib/scrape/tabs.ts`
- Modify: `src/components/scrape/LeadFinder.tsx`, `src/app/sourcing/finder/page.tsx`
- Test: `tests/scrape.tabs.test.ts`

**Interfaces:**
- Consumes: `BusinessRow` (with `hasWebsite`, `movedLeadId`), `moveToLeads` action, `DataTable`.
- Produces: `export type WebsiteTab = "without" | "with"`; `splitByWebsite(rows: BusinessRow[]): Record<WebsiteTab, BusinessRow[]>`; `<WebsiteTabs idBase value counts onChange />`.

- [ ] **Step 1: Write the failing test**

Create `tests/scrape.tabs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { splitByWebsite } from "@/lib/scrape/tabs";
import type { BusinessRow } from "@/lib/scrape/types";

const b = (id: string, over: Partial<BusinessRow> = {}): BusinessRow => ({
  id, placeKey: "k" + id, scrapedOn: "2026-10-13", scrapedAt: "2026-10-13 10:00:00", query: "q", category: "Roofing", city: "Dallas", state: "TX",
  name: "Biz " + id, phone: "", address: "", mapsCategory: "", rating: null, reviewCount: null, email: "", facebookUrl: "", instagramUrl: "",
  otherLinks: [], mapsUrl: "https://maps.example/" + id, movedLeadId: null, hasWebsite: false, websiteUrl: "", ...over,
});

describe("splitByWebsite", () => {
  it("puts businesses with a website in one tab and the rest in the other, keeping order", () => {
    const rows = [b("1"), b("2", { hasWebsite: true, websiteUrl: "https://a.example" }), b("3"), b("4", { hasWebsite: true })];
    const got = splitByWebsite(rows);
    expect(got.without.map((r) => r.id)).toEqual(["1", "3"]);
    expect(got.with.map((r) => r.id)).toEqual(["2", "4"]);
  });
  it("treats rows saved before the website fields existed as having no website", () => {
    const legacy = { ...b("9") } as Partial<BusinessRow>;
    delete legacy.hasWebsite;
    expect(splitByWebsite([legacy as BusinessRow]).without).toHaveLength(1);
  });
  it("returns two empty lists for no rows", () => {
    expect(splitByWebsite([])).toEqual({ without: [], with: [] });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run tests/scrape.tabs.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: The split helper**

Create `src/lib/scrape/tabs.ts`:

```ts
import type { BusinessRow } from "./types";

export type WebsiteTab = "without" | "with";

/** The finder's two tabs. A row with no `hasWebsite` (saved before the field existed) counts as having none. */
export function splitByWebsite(rows: BusinessRow[]): Record<WebsiteTab, BusinessRow[]> {
  const out: Record<WebsiteTab, BusinessRow[]> = { without: [], with: [] };
  for (const r of rows) out[r.hasWebsite ? "with" : "without"].push(r);
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run tests/scrape.tabs.test.ts` — Expected: PASS.

- [ ] **Step 5: The tab bar**

Create `src/components/scrape/WebsiteTabs.tsx` (same markup and keyboard handling as `SizeTabs` in `src/components/catalog/CatalogControls.tsx`):

```tsx
"use client";

import { useRef } from "react";
import type { WebsiteTab } from "@/lib/scrape/tabs";

const TABS: { id: WebsiteTab; label: string }[] = [
  { id: "without", label: "Without website" },
  { id: "with", label: "With website" },
];

/** Two tabs over the finder's saved businesses. The panel they control carries `id={`${idBase}-panel`}`. */
export function WebsiteTabs({ idBase, value, counts, onChange }: { idBase: string; value: WebsiteTab; counts: Record<WebsiteTab, number>; onChange: (t: WebsiteTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function key(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    onChange(TABS[n]!.id);
    refs.current[n]?.focus();
  }
  return (
    <div role="tablist" aria-label="Businesses by website" className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          id={`${idBase}-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-controls={`${idBase}-panel`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => key(e, i)}
          className="-mb-px min-h-11 border-b-2 border-transparent px-4 text-base font-medium text-muted hover:text-head aria-selected:border-head aria-selected:text-head"
        >
          {t.label}<span className="ml-2 tabular-nums">{counts[t.id]}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: `LeadFinder.tsx`**

1. Imports: add `import { WebsiteTabs } from "@/components/scrape/WebsiteTabs";` and `import { splitByWebsite, type WebsiteTab } from "@/lib/scrape/tabs";`; remove nothing else.
2. State: after `const [moveError, …]` add `const [tab, setTab] = useState<WebsiteTab>("without");`.
3. The component comment becomes: `"Find businesses": runs the local Google Maps lead finder for the chosen category and city. It saves every business the listing shows, with or without a website, and adds each as a lead. Renders nothing unless …` (keep the last sentence).
4. The `Props.canMove` doc: `/** The person can add leads, so "Add to leads" is on. */`.
5. In `columns`, replace the last column (`id: "move"`) with these two (a website column is only useful on the With tab but harmless to keep out of the Without tab, so build it conditionally below):

```tsx
  const websiteColumn: Column<BusinessRow> = {
    id: "website", label: "Website", sort: (r) => r.websiteUrl,
    cell: (r) => (r.websiteUrl ? <ExternalLink href={r.websiteUrl}>{hostOf(r.websiteUrl)}</ExternalLink> : "—"),
  };
  const leadColumn: Column<BusinessRow> = {
    id: "lead", label: "Lead", srOnlyHeader: true,
    cell: (r) => r.movedLeadId ? (
      <Link href={`/leads/${r.movedLeadId}`}>Open lead<span className="sr-only"> {r.name}</span></Link>
    ) : (
      <Button variant="secondary" disabled={!canMove || moving === r.id} onClick={() => move(r)}>
        {moving === r.id ? "Adding…" : "Add to leads"}
        <span className="sr-only"> {r.name}</span>
      </Button>
    ),
  };
```

   Keep the existing columns array minus the old `move` column, rename it `baseColumns` (it now ends with the "Maps" column), and after the early return / `limitReached` line add:

```tsx
  const split = splitByWebsite(rows);
  const shown = split[tab];
  const columns = tab === "with" ? [...baseColumns, websiteColumn, leadColumn] : [...baseColumns, leadColumn];
```

   Add at the bottom of the file:

```tsx
function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}
```

6. The header block: `<span className="text-sm text-muted">Optional · runs on this computer</span>`, title `Find businesses` (id `lf-title`), and the paragraph:

```tsx
        <p className="max-w-3xl text-sm text-muted">
          Searches Google Maps for “{cat} in {city}, {st}”, opens each listing and saves every business with every contact detail the
          listing shows, whether or not it has a website. Each one is added to your leads as it is saved. It visits Google Maps and
          nothing else, one listing every few seconds, so a run takes longer than it looks; closing this page stops it.
        </p>
```

7. The results block (replace from `<div className="space-y-2">` to its end):

```tsx
      <div className="space-y-2">
        <h4 className="text-lg">Saved for {cat} in {city}, {st}</h4>
        {!canMove && <p className="text-sm text-muted">Your role can’t add leads, so businesses that aren’t leads yet can’t be added.</p>}
        <WebsiteTabs idBase="lf" value={tab} counts={{ without: split.without.length, with: split.with.length }} onChange={setTab} />
        <div id="lf-panel" role="tabpanel" aria-labelledby={`lf-tab-${tab}`} className="space-y-2 pt-2">
          {shown.length === 0 ? (
            <p className="text-muted">
              {rows.length === 0
                ? "Nothing saved yet for this category and city. Click “Find businesses”."
                : tab === "with" ? "No saved business with a website for this category and city." : "No saved business without a website for this category and city."}
            </p>
          ) : (
            <DataTable key={tab} label={tab === "with" ? "Businesses with a website" : "Businesses without a website"} rows={shown} columns={columns} rowKey={(r) => r.id} minWidth={1120} pageSize={10} />
          )}
        </div>
        {moveError && <p role="alert" className="flex items-center gap-2"><AlertIcon /> {moveError}</p>}
      </div>
```

   The hooks (`useState`, `useRef`, …) are all above the early `if (!enabled || !ready) return null;`; `split`/`shown`/`columns` are computed after it, so no hook order changes. The existing `move()` keeps working (it patches `movedLeadId` into `rows`).

- [ ] **Step 7: Page copy**

`src/app/sourcing/finder/page.tsx`: set `sub="Searches Google Maps from this computer and saves every business it finds, with or without a website, as a lead for you. Results are checked against everyone's, so nobody sources the same business twice."`

- [ ] **Step 8: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm brand && pnpm exec vitest run tests/scrape.tabs.test.ts`
Expected: all clean/PASS. Then check it in the app (port 5021): `pnpm dev`, sign in, open `/sourcing/finder`, pick a category/state/city. Without a real Maps run the list shows the empty state; verify the two tabs render, switch with mouse and ←/→ keys, and the counts show 0. If a seeded finder row is easy to insert (`pnpm exec tsx scripts/...` is not needed — a SQL insert into `finder_businesses` with `has_website=1` in the local `okit` DB is enough), confirm it appears only under "With website" with a Website link and "Add to leads". State clearly in your report whether you ran this browser check or not.

- [ ] **Step 9: Commit**

```bash
git add src/components/scrape/WebsiteTabs.tsx src/lib/scrape/tabs.ts src/components/scrape/LeadFinder.tsx src/app/sourcing/finder/page.tsx tests/scrape.tabs.test.ts
git commit -m "feat(finder): show saved businesses in With / Without website tabs

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: State, City and Category filters on the Leads page

**Files:**
- Create: `src/lib/leads/placeFilters.ts`
- Modify: `src/app/leads/page.tsx`, `src/components/leads/LeadFilters.tsx`
- Test: `tests/leads.placeFilters.test.ts`

**Interfaces:**
- Consumes: `LeadListItem` fields `state: string`, `city: string`, `category: string | null` (as used on the Leads page today); `isRegion`, `regionName` from `@/lib/market/regions`.
- Produces:
  - `export interface PlaceFilter { state?: string; city?: string; cat?: string }`
  - `export function matchesPlace(l: Placed, f: PlaceFilter): boolean` where `type Placed = { state: string; city: string; category?: string | null }`
  - `export interface PlaceOption { v: string; l: string; count: number }`
  - `export function placeOptions(leads: Placed[], f: PlaceFilter): { states: PlaceOption[]; cities: PlaceOption[]; cats: PlaceOption[] }`
  - `LeadFilters` gains props `state?: string; city?: string; cat?: string; stateOptions?: PlaceOption[]; cityOptions?: PlaceOption[]; catOptions?: PlaceOption[]`.

- [ ] **Step 1: Write the failing tests**

Create `tests/leads.placeFilters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchesPlace, placeOptions } from "@/lib/leads/placeFilters";

const L = (state: string, city: string, category: string | null) => ({ state, city, category });
const leads = [
  L("TX", "Dallas", "Roofing"), L("TX", "Dallas", "Plumbing"), L("TX", "Austin", "Roofing"),
  L("OR", "Portland", "Roofing"), L("ME", "Portland", "Plumbing"), L("tx", "Dallas", "Roofing"),
  L("", "", null),
];

describe("matchesPlace", () => {
  it("matches on state (any case), city and category together", () => {
    expect(leads.filter((l) => matchesPlace(l, { state: "TX" })).length).toBe(4);
    expect(leads.filter((l) => matchesPlace(l, { state: "TX", city: "Dallas", cat: "Roofing" })).length).toBe(2);
    expect(leads.filter((l) => matchesPlace(l, {})).length).toBe(leads.length);
  });
  it("does not choke on leads with no state, city or category", () => {
    expect(matchesPlace(L("", "", null), { cat: "Roofing" })).toBe(false);
    expect(matchesPlace(L("", "", null), { state: "TX" })).toBe(false);
  });
});

describe("placeOptions", () => {
  it("lists each value once with a count, skipping empty values", () => {
    const o = placeOptions(leads, {});
    expect(o.states.map((s) => [s.v, s.count])).toEqual([["ME", 1], ["OR", 1], ["TX", 4]]);
    expect(o.cats.map((c) => [c.v, c.count])).toEqual([["Plumbing", 2], ["Roofing", 4]]);
    expect(o.cities.map((c) => c.v)).toEqual(["Austin", "Dallas", "Portland"]);
  });
  it("labels a state with its name", () => {
    expect(placeOptions(leads, {}).states.find((s) => s.v === "TX")!.l).toBe("Texas (TX)");
  });
  it("narrows cities to the chosen state, so a city shared by two states is told apart", () => {
    expect(placeOptions(leads, { state: "OR" }).cities.map((c) => [c.v, c.count])).toEqual([["Portland", 1]]);
    expect(placeOptions(leads, {}).cities.find((c) => c.v === "Portland")!.count).toBe(2);
  });
  it("counts each list under the other two filters", () => {
    const o = placeOptions(leads, { state: "TX", cat: "Roofing" });
    expect(o.cities.map((c) => [c.v, c.count])).toEqual([["Austin", 1], ["Dallas", 2]]);
    expect(o.states.map((s) => [s.v, s.count])).toEqual([["OR", 1], ["TX", 3]]);
  });
  it("keeps a chosen value in its list even when nothing matches, so the dropdown can show it", () => {
    const o = placeOptions(leads, { state: "TX", city: "Portland" });
    expect(o.cities.find((c) => c.v === "Portland")).toMatchObject({ count: 0 });
  });
});
```

(Expected-value check on the states list: with `{}` the states are TX (Dallas, Dallas, Austin, + the lowercase `tx` one = 4), OR 1, ME 1, sorted by value → ME, OR, TX. In the `{ state: "TX", cat: "Roofing" }` case the states list ignores the state filter itself and applies city/cat only: Roofing leads are TX Dallas, TX Austin, OR Portland, tx Dallas → OR 1, TX 3.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run tests/leads.placeFilters.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: The filter module**

Create `src/lib/leads/placeFilters.ts`:

```ts
// The Leads page's State, City and Category filters: what matches, and what each dropdown offers.
import { isRegion, regionName } from "@/lib/market/regions";

export interface PlaceFilter { state?: string; city?: string; cat?: string }
export type Placed = { state: string; city: string; category?: string | null };
export interface PlaceOption { v: string; l: string; count: number }

const stateOf = (l: Placed) => l.state.trim().toUpperCase();
const cityOf = (l: Placed) => l.city.trim();
const catOf = (l: Placed) => (l.category ?? "").trim();

/** True when the lead fits every filter that is set. A lead with no state, city or category fits none of the filters that name one. */
export function matchesPlace(l: Placed, f: PlaceFilter): boolean {
  return (!f.state || stateOf(l) === f.state.toUpperCase()) && (!f.city || cityOf(l) === f.city) && (!f.cat || catOf(l) === f.cat);
}

const stateLabel = (code: string) => (isRegion(code) ? `${regionName(code)} (${code})` : code);

function options(values: string[], chosen: string | undefined, label: (v: string) => string): PlaceOption[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  if (chosen && !counts.has(chosen)) counts.set(chosen, 0); // keep what is picked visible even when it matches nothing
  return [...counts].map(([v, count]) => ({ v, l: label(v), count })).sort((a, b) => a.v.localeCompare(b.v));
}

/** Each dropdown's choices, counted under the other two filters (its own filter does not narrow its own list). */
export function placeOptions(leads: Placed[], f: PlaceFilter): { states: PlaceOption[]; cities: PlaceOption[]; cats: PlaceOption[] } {
  const state = f.state?.toUpperCase();
  const without = (drop: keyof PlaceFilter) => leads.filter((l) => matchesPlace(l, { ...f, [drop]: undefined }));
  return {
    states: options(without("state").map(stateOf), state, stateLabel),
    cities: options(without("city").map(cityOf), f.city, (v) => v),
    cats: options(without("cat").map(catOf), f.cat, (v) => v),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm exec vitest run tests/leads.placeFilters.test.ts` — Expected: PASS. If the `cities` ordering or counts in the "narrows cities" case differ, the test is right: the City list must be computed under state+cat, so fix the module, not the test.

- [ ] **Step 5: The Leads page (`src/app/leads/page.tsx`)**

1. Import: `import { matchesPlace, placeOptions } from "@/lib/leads/placeFilters";` and `isRegion` is already unneeded here.
2. `searchParams` type gains `state?: string; city?: string; cat?: string`.
3. After the `size` line (`const size = …`), add:

```ts
  const place = { state: sp.state?.trim().toUpperCase() || undefined, city: sp.city?.trim() || undefined, cat: sp.cat?.trim() || undefined };
```

4. `inMarket` becomes the leads that also fit the place filters:

```ts
  const inMarket = all.filter((l) => (!country || countryOfLead(l) === country) && (!size || sizeOfLead(l) === size) && matchesPlace(l, place));
```

   The country and size option counts (`countryOptions`, `sizeOptions`) keep using `all` as today; the place dropdowns get their own options computed over the leads that fit country, size, stage, tier and held-by *but not the place filters*, so counts don't collapse:

```ts
  const forPlaceOptions = all.filter((l) => (!country || countryOfLead(l) === country) && (!size || sizeOfLead(l) === size)
    && (!by || heldKey(l) === by) && (!stage || l.stage === stage) && (!tier || l.tier === tier));
  const placeOpts = placeOptions(forPlaceOptions, place);
```

   (`by` is defined above `inMarket`; place this block after `by`, `stage`, `tier` and `country`/`size` are defined, i.e. right after the `size` / `place` lines, and move nothing else.)
5. The empty-state test includes the place filters: `{stage || tier || by || country || size || place.state || place.city || place.cat ? "No leads match those filters." : …}`.
6. Pass the new props to `<LeadFilters … state={place.state} city={place.city} cat={place.cat} stateOptions={placeOpts.states} cityOptions={placeOpts.cities} catOptions={placeOpts.cats} />`.

- [ ] **Step 6: `LeadFilters.tsx`**

1. Import `type PlaceOption` from `@/lib/leads/placeFilters` and add the props to `Props` (all optional):

```ts
  /** Place filters: state, city and category of the lead, with the choices and counts the page computed. */
  state?: string;
  city?: string;
  cat?: string;
  stateOptions?: PlaceOption[];
  cityOptions?: PlaceOption[];
  catOptions?: PlaceOption[];
```

2. Destructure them in the component signature (`state`, `city`, `cat`, `stateOptions`, `cityOptions`, `catOptions`).
3. Replace `go` so it carries every filter, with the place filters carried like country and size:

```ts
  // Country, size and the place filters combine with everything; they are carried unless the change names them.
  type Next = { stage?: string; tier?: string; by?: string; country?: string; size?: string; state?: string; city?: string; cat?: string };
  function go(next: Next, carried: Pick<Next, "country" | "size" | "state" | "city" | "cat"> = { country, size, state, city, cat }) {
    const p = new URLSearchParams();
    if (next.stage) p.set("stage", next.stage);
    if (next.tier) p.set("tier", next.tier);
    if (next.by) p.set("by", next.by);
    const m = { ...carried, ...("country" in next ? { country: next.country } : {}), ...("size" in next ? { size: next.size } : {}),
      ...("state" in next ? { state: next.state } : {}), ...("city" in next ? { city: next.city } : {}), ...("cat" in next ? { cat: next.cat } : {}) };
    if (m.country) p.set("country", m.country);
    if (m.size) p.set("size", m.size);
    if (m.state) p.set("state", m.state);
    if (m.city) p.set("city", m.city);
    if (m.cat) p.set("cat", m.cat);
    router.push("/leads" + (p.size ? "?" + p : ""));
  }
```

   (The existing calls `go({ by })`, `go({ stage, tier, by, country: … })` keep working.)
4. `const active = !!(stage || tier || by || country || size || state || city || cat);`
5. Add three dropdowns before the "Clear filters" button (same markup as the Country dropdown). Changing the state clears the city, because the city list is narrowed by state:

```tsx
      {stateOptions && stateOptions.length > 0 && (
        <div className="w-full sm:w-56">
          <label htmlFor="f-state" className={labelClass}>State</label>
          <Select id="f-state" value={state ?? ""} onChange={(e) => go({ stage, tier, by, state: e.target.value || undefined, city: undefined })}>
            <option value="">Any</option>
            {stateOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
          </Select>
        </div>
      )}
      {cityOptions && cityOptions.length > 0 && (
        <div className="w-full sm:w-56">
          <label htmlFor="f-city" className={labelClass}>City</label>
          <Select id="f-city" value={city ?? ""} onChange={(e) => go({ stage, tier, by, city: e.target.value || undefined })}>
            <option value="">Any</option>
            {cityOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
          </Select>
        </div>
      )}
      {catOptions && catOptions.length > 0 && (
        <div className="w-full sm:w-56">
          <label htmlFor="f-cat" className={labelClass}>Category</label>
          <Select id="f-cat" value={cat ?? ""} onChange={(e) => go({ stage, tier, by, cat: e.target.value || undefined })}>
            <option value="">Any</option>
            {catOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
          </Select>
        </div>
      )}
```

   Note the existing Prospecting/Outreach/Closing `pick()` calls `go({ by })` / `go({ stage … , by })` and the Held by / Country / Size onChange handlers call `go({ stage, tier, by, … })` — none of them names the place filters, so those are carried automatically.

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm brand && pnpm exec vitest run tests/leads.placeFilters.test.ts tests/leads.test.ts`
Expected: clean/PASS. Then in the app on port 5021 (`/leads`): pick a State → the City list narrows and the table filters; pick a Category; change State and confirm City resets; hit `/leads?state=TX&city=Nowhere` and confirm "No leads match those filters." plus a working Clear filters; confirm each filter survives a change to stage/held-by. State in the report whether this was run.

- [ ] **Step 8: Commit**

```bash
git add src/lib/leads/placeFilters.ts src/app/leads/page.tsx src/components/leads/LeadFilters.tsx tests/leads.placeFilters.test.ts
git commit -m "feat(leads): filter by state, city and category

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docs and full verification

**Files:**
- Modify: `README.md` (lines ~85-92), `docs/team-format.md` (finder businesses section), `docs/hostinger-install.md` only if it mentions the finder skipping websites (grep first)
- Do not touch: `CHANGES.md`, `scripts/changes.ts`, `docs/roles.md`, `docs/source/roles-system.html`

- [ ] **Step 1: README**

Replace the lead-finder paragraph (the lines starting "In the console (or **Lead finder** for researchers)…" through the "**What it reads.**" and "**Today's limit**" bullets) with text that says:
  - the finder is on its own page, **Lead finder**; pick a category, state and city, choose **Today's limit**, click **Find businesses**;
  - progress reads "Checked 23 · saved 7 · with website 5 · without website 2";
  - every business it can read is saved, with or without a website, and **added to your leads as it is saved** (a business already someone's lead is skipped);
  - results are in two tabs, **Without website** and **With website**; a business without a lead yet (saved by an older version, or refused) has an **Add to leads** button;
  - **What it reads.** Google Maps only; for each listing it saves what the listing shows (name, phone, address, rating, review count when shown, email, Facebook, Instagram, other social and booking links, and the website address when there is one). A booking link on the business's own domain counts as a website;
  - **Today's limit** is a ceiling on new businesses saved per local calendar day by that person, with or without a website; a business already found by anyone or already a lead is skipped and does not count;
  - runs take longer than before because every new listing is opened.
  Keep the remaining bullets about Maps selectors and the terminal command as they are.

- [ ] **Step 2: team-format**

In `docs/team-format.md`, in the description of `finder/businesses.jsonl` lines add: `hasWebsite` (boolean) and `websiteUrl` (string), both optional; a line without them is read as no website. Find the spot with `grep -n "mapsUrl" docs/team-format.md`.

- [ ] **Step 3: Full verification**

Run each and read the output:

```bash
pnpm typecheck
pnpm lint
pnpm brand
pnpm test
pnpm parity
pnpm golden:sweep
git diff --stat -- CHANGES.md src/data src/content src/kits
```

Expected: typecheck/lint/brand clean; `pnpm test` all PASS with `tests/scrape.run.test.ts` and `tests/mysqlStore.test.ts` executed (not skipped; if either shows as skipped, fix the environment and re-run); parity and golden sweep report no changes; the final `git diff --stat` prints nothing.

- [ ] **Step 4: Apply the migration to the local database and look at the app**

Run: `pnpm db:migrate` (applies `0002_finder_website.sql` to the local `okit` database; safe to repeat), then `pnpm dev` on port 5021 and open `/sourcing/finder` and `/leads` once to confirm both pages load without errors. A real Google Maps run is not part of this check (it needs a live Google connection and can trigger a CAPTCHA); say so in the report instead of claiming it was run.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/team-format.md
git commit -m "docs: finder saves every business and adds it as a lead

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

# Lead finder: save everything as leads, website tabs, Leads filters

Date: 2026-10-13. Status: design approved in chat, written spec awaiting review.

## Goal

Today the Google Maps lead finder keeps only businesses that show no website, parks them in a staging list, and a person clicks
"Move to Leads" on each one. The owner wants:

1. The finder saves each business it finds as a lead without a click.
2. It keeps every business, with or without a website.
3. The finder's results show two tabs: with website and without website.
4. The Leads page can be filtered by state, city and category.

## Assumptions (agreed in chat)

- Duplicates are still blocked: a business already someone's lead is not saved as a second lead.
- "Today's limit" counts every business saved, with or without a website.
- Tabs appear on the finder results only. The Leads page gets the filters, not tabs.
- Roles and permissions do not change (`finder.run`, `leads.add`).

## Approach

Keep `finder_businesses` (and `business_keys`) as the finder's saved-businesses store. It already provides the team-wide duplicate guard,
the daily count and the results list. Add website data to it and create the lead automatically after each save.

### 1. Scraper (`src/lib/scrape/scraper.ts`, `types.ts`, `limits.ts`)

- Remove the skip on `card.hasWebsiteButton` and the skip on `listing.hasWebsite`. Every listing not already saved is opened.
- `NewBusiness` / `BusinessRow` gain `hasWebsite: boolean` and `websiteUrl: string`, filled from `ParsedListing`.
- Counters: `noWebsite` and `skippedHasWebsite` become `withWebsite` and `withoutWebsite` (both saved). `progressLine` reads
  "Checked N · saved N · with website X · without Y" plus the existing duplicate and unreadable parts.
- `finder_runs.skipped_has_website` stays in the schema and is written as 0.
- The run is slower, since listings once skipped from their card are now opened. The 2–5 s pause stays. Copy on the page says so.
- The daily budget counts all saved businesses. Wording of `limits.ts` comments and labels is updated.

### 2. Auto-save as a lead (migration `db/migrations/0002_finder_website.sql`, `leadMap.ts`, run route)

- Migration adds `has_website TINYINT(1) NOT NULL DEFAULT 0` and `website_url VARCHAR(1000) NOT NULL DEFAULT ''` to `finder_businesses`.
  Existing rows therefore read as "no website", which is true of everything the old finder saved.
- After `insertBusiness` succeeds, the run creates the lead through the same path as `moveToLeads`: `businessToLeadForm` → `parseLeadForm` →
  `store.createLead` → `markMoved`. The shared logic moves into one function used by both the run and the manual action.
- `businessToLeadFields`: `website_found` is `yes` or `no`; `website_url` is set when there is one; `check_no_real_website` is `on` only
  when there is no website. Notes say "Found with the Google Maps lead finder on <date>" and drop the "(no website shown)" text when a website exists.
- If `createLead` refuses (duplicate lead, validation), the business stays saved and unmoved, and the run continues. The count of refusals shows in the progress line.
- The `saved` run event carries the business with its `movedLeadId`, so the UI shows "Open lead" at once.
- `moveToLeads` stays for rows that have no lead (rows saved before this change, or refused as duplicates). It is shown as "Add to leads", only on those rows.

### 3. Finder results (`src/components/scrape/LeadFinder.tsx`, `FinderPage.tsx`, `sourcing/finder/page.tsx`)

- Replace the single table with two tabs, "Without website (n)" and "With website (n)", built as an accessible tablist (arrow keys, `aria-selected`,
  `role="tabpanel"`). Opens on "Without website". Each panel has its own `DataTable`.
- The "Move to Leads" column becomes a link column: "Open lead" when moved, "Add to leads" otherwise. The With website tab also shows the website link.
- Heading, description and empty-state copy say the finder saves all businesses and creates leads automatically.
- Brand rules hold (four colours, Jost 400/500, no `<b>`). `pnpm brand` must pass.

### 4. Leads filters (`src/app/leads/page.tsx`, `src/components/leads/LeadFilters.tsx`)

- Three dropdowns: State, City, Category. URL params `state`, `city`, `cat`; all combine with the existing stage, tier, held-by, country and size filters.
- Options come from the leads in view, with counts that respect the other active filters. The City options narrow to the chosen state.
  Changing the state clears a city that no longer applies.
- "No leads match those filters." and the clear-filters control cover the new params.
- `go()` in `LeadFilters` is extended so every filter change carries the three new params.

### 5. Store, tests, docs

- `FinderStore` in `src/lib/store/store.ts`, `mysqlStore.ts` and `fileStore.ts` carry the two new fields. `tests/contract/storeContract.ts` covers insert and
  read-back of `hasWebsite` / `websiteUrl` so both stores stay in step.
- `docs/team-format.md` notes the new fields for the file store; `pnpm db:import-team` still reads old files (missing fields default to no website).
- Tests updated: `tests/scrape.run.test.ts` (all listings saved, auto-lead created, duplicate refusal leaves the business unmoved),
  `tests/scrape.leadmap.test.ts` (website yes/no fields), plus a test for the leads filter logic.
- Done means `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm brand` pass, and `pnpm parity` / `pnpm golden:sweep` show no change.

## Out of scope

- Website tabs on the Leads page.
- Backfilling leads from old unmoved businesses (they keep the "Add to leads" button).
- Removing `finder_runs.skipped_has_website` or the `sync.run` permission.

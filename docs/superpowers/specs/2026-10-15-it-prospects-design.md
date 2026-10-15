# IT Prospects: design and decisions (2026-10-15)

Built from `docs/prompts/F-it-buyers-and-agencies.md`. The owner asked for the whole prompt to run without stopping, so the
review stops after Step 1 and Step 2 were skipped. **Every decision below was taken on the prompt's stated default and is
unreviewed.** The category rows and qualifier weights are judgement, not measured data.

## What it is

IT Prospects is a separate area at `/it`. It finds and qualifies three kinds of prospect from The Outreach Reset
(`docs/source/outreach-reset.html`):

| Segment (code) | Who | Found by | First offer |
|---|---|---|---|
| Live buying signal (`buyer`) | A company with an open developer role, a project post, a tender, or a "looking for a developer" post | Signals inbox (paste or CSV), search strings | The project, or a paid test (2-week trial developer, one fixed-price feature) |
| IT and digital business (`agency`) | Web, digital, SEO and e-commerce agencies, studios, software houses, app developers, IT services firms, IT consultants | IT finder (Google Maps) | One paid white-label test ticket, then a monthly capacity plan |
| Business with an IT need (`it_need`) | A growing firm hiring IT support, data entry or an ops admin, or running on spreadsheets | Signals inbox | Workflow audit or discovery sprint, then a fixed-price build |

## Decisions taken on the prompt's defaults

1. **Agencies are partners** we sell white-label capacity to. They get no website kit.
2. **Scope:** finding, qualifying and a simple pipeline. Outreach copy, sequences and the weekly review stay in Phase 12, to be built inside this area later.
3. **Countries:** US first; Canada and the UAE are there through `src/lib/market/` regions.
4. **No scraping** of sites that need a login or forbid automated access. No automated signal source was added. The candidates are in the source table below, for the owner to approve by name.
5. **Name and routes:** "IT Prospects", `/it`, one navigation entry ("IT Prospects", placed before Playbook) while the switch is on. The area has its own tabs: Overview, Prospects, Signals inbox, IT finder, Search strings.
6. **Switch:** the existing, unused `features.softwareTrack` (column `feature_software_track`), relabelled "IT Prospects" on the Feature switches page. Default off. When it is off, the navigation entry is hidden, the pages show "switched off", and the actions and APIs refuse.
7. **IT finder daily limit:** counted separately from the lead finder's, per person per day, with the same options (20/50/70/100). It shares the lead finder's one-browser-per-server lock, because both drive the same Google Maps from the same address.
8. **Pipeline stages:** New, Qualified, Contacted, Replied, Call booked, Won, Lost, Parked. Any stage can move to any other.
9. **No hand-off to Leads.** Duplicates are blocked within IT Prospects only. A company can be both a local lead and an IT prospect.

## Separation map

**New files:**
- `db/migrations/0004_it_prospects.sql`
- `src/lib/it/*`: `model`, `keys`, `form`, `parseSignal`, `importCsv`, `searchStrings`, `categories`, `csv`, `fromFinder`, `finderHttp`, `server`
- `src/lib/store/itMysql.ts`
- `src/app/it/**`: pages, `actions.ts`, `export.csv`
- `src/app/api/it/finder/**`
- `src/components/it/*`
- `tests/itStore.test.ts`, `tests/it.lib.test.ts`, `tests/it.finder.run.test.ts`
- This spec

**Existing files touched, and why:**

| File | Change |
|---|---|
| `src/lib/store/store.ts` | Adds the `ItStore` interface and `Store.it()` |
| `src/lib/store/mysqlStore.ts` | `it()` lends its pool, checks and transaction to `itMysql.ts`. Nothing else changed |
| `src/lib/store/fileStore.ts` | `it()` refuses: IT Prospects is MySQL only (see Deviations) |
| `src/lib/auth/permissions.ts` | A fifth group and seven `it.*` keys |
| `src/lib/auth/routes.ts` | Route rules for `/it` and `/api/it/finder` |
| `src/lib/auth/nav.ts` | `withItNav()`. The per-role `NAV` lists are unchanged |
| `src/components/shell/AppChrome.tsx` | Reads the switch and adds the entry |
| `src/components/admin/FeaturesForm.tsx`, `src/app/platform/page.tsx` | Switch label |
| `src/lib/playbookExt.ts`, `src/lib/playbook.ts` | Playbook section 15, "Finding IT buyers" |
| `docs/source/roles-system.html`, `docs/roles.md` | Regenerated with the new rows |
| `tests/roles.test.ts` | The independent matrix gains the seven rows. It must cover every key |
| `scripts/lib/demoTeam.ts`, `scripts/a11y.ts`, `scripts/e2e.ts`, `scripts/screenshots.ts` | Demo prospects, IT pages in the accessibility pass, an IT part in the end-to-end run, and IT pages in screenshots |
| `README.md`, `docs/team-format.md`, `CLAUDE.md` | Docs |

The leads, the lead finder, the Board, the Kit Console and the port are not touched. `pnpm parity` and `pnpm golden:sweep` are unchanged.

## Signal types

| Code | Label | Stale after | Starts in segment |
|---|---|---|---|
| `dev_role` | Open developer role (30+ days open or several roles is strongest) | 60 days | buyer |
| `it_role` | Open IT or operations role | 60 days | it_need |
| `project_post` | Project post ("share your portfolio and commercials") | 14 days | buyer |
| `tender` | RFP or tender | 30 days | buyer |
| `looking_for` | "Looking for a developer/agency" post | 14 days | buyer |
| `ai_rescue` | AI-built app needs help | 30 days | buyer |
| `site_launch` | Agency launched a client site (Reset A/B version B) | 60 days | agency |

A prospect's signal state is **fresh** if any of its signals is within its type's window, **stale** if it has signals but none are fresh, and **none** if it has no signals. A signal without a date is never fresh.

## The IT finder's categories

The scores use the Reset's six segment factors, 1–5 each: budget, buys often, reachable, accepts offshore, proof fit, visible trigger. That is a deviation from the Board's seven factors; see Deviations.

| Category | Score | Maps labels expected (check on the first runs) |
|---|---|---|
| Web design agencies | 26 | Website designer, Web design agency |
| Digital marketing agencies | 25 (the Reset's own row) | Internet marketing service, Marketing agency |
| Software companies | 23 | Software company |
| E-commerce agencies | 22 | E-commerce service, Internet marketing service |
| SEO agencies | 22 | Internet marketing service, Search engine optimization agency |
| Branding and design studios | 21 | Graphic designer, Design agency |
| Advertising agencies | 20 | Advertising agency |
| IT consultants | 20 | Computer consultant, Business management consultant |
| Mobile app developers | 20 | Software company, Mobile app developer |
| IT services companies | 18 | Computer support and services, IT services |
| Social media agencies | 18 (strong fit in the UAE) | Social media agency, Marketing agency |
| Marketing consultants | 18 | Marketing consultant |

## Sources for buying signals (checked 2026-10-15)

| Source | Automated use allowed? | Recommendation |
|---|---|---|
| LinkedIn Jobs and posts | No. User Agreement §8.2 bans scrapers and bots; the API terms ban storing content | Copy-only search strings, plus paste |
| Indeed | No. Terms §D.21 need written permission for any automated system; the Publisher API is closed | Copy-only search strings, plus paste |
| Wellfound | No. Terms ban scraping and commercial use of content | Copy-only search strings, plus paste |
| Upwork | RSS ended 20 Aug 2024. The API needs an approved use case; lead generation is unverified | Paste |
| Clutch | No. Terms ban scraping and building a searchable database | Paste |
| Reddit | No for us. Commercial use needs an agreement; new API access stops 31 Oct 2026 | Copy-only search strings, plus paste |
| Google Search | No. The Custom Search JSON API is closed to new customers and ends 1 Jan 2027 | Copy-only search strings |
| SAM.gov | Yes, with conditions: API key; 10 requests a day without a role, 1,000 with one. NAICS 541511, 541512, 541519 | **Candidate for an approved automated source** |
| CanadaBuys | Yes. Open Government Licence – Canada; attribution required; daily CSV | **Candidate for an approved automated source** |
| UAE portals (Dubai eSupply, Abu Dhabi ADGPG, MoF DPP) | Unverified. No open data or API found; registration needed | Paste |
| Socrata city and state feeds, Greenhouse and Lever boards, RemoteOK, HN "Who is hiring" | Yes, with conditions (licence per dataset; attribution for RemoteOK) | Candidates, each needing the owner's approval |

Quotes and links are in the research notes behind this table. Some pages couldn't be fetched (Upwork legal, Reddit's Data API terms, We Work Remotely), so those rows rest on secondary sources.

## Schema (`0004_it_prospects.sql`)

| Table | Holds |
|---|---|
| `it_prospects` | One row per company: owner, assignee, segment, contact and place fields, Maps fields, stage, qualifier (JSON), notes, source |
| `it_keys` | The duplicate guard: `d:` domain, `e:` email, `p:` phone digits, `m:` Maps place, `n:` name + city. Each key is unique across all prospects |
| `it_signals` | Many per prospect. Deleted with the prospect |
| `it_events` | History: created, stage, assign, signal, comment |
| `it_finder_runs`, `it_finder_businesses`, `it_finder_keys` | The IT finder's own copy of the lead finder's tables. A result is added as a prospect through `prospect_id` |

Scope works as for leads. A person sees a prospect when its owner or its assignee falls within their scope of `it.view`. Only the owner or the assignee edits it, and only the owner deletes it.

## Permissions (`it.*`)

Columns: Super Admin, Admin, Manager, BD, Researcher, Viewer.

| Key | Super Admin | Admin | Manager | BD | Researcher | Viewer |
|---|---|---|---|---|---|---|
| `it.view` | all | all except the Super Admin's | team | own | own | — |
| `it.add` | own | own | own | own | own | — |
| `it.edit` | own | own | own | own | own | — |
| `it.assign` | all | all except the Super Admin's | team | — | — | — |
| `it.comment` | all | all except the Super Admin's | team | own | own | — |
| `it.export` | all | all except the Super Admin's | team | own | — | — |
| `it.finder` | own | own | own | own | own | — |

## Qualifier

There are six yes/no questions: has budget, buys often, reachable, accepts an offshore team, our proof fits, and visible trigger. A fresh signal counts as the trigger automatically. The score is out of 6: 5–6 is hot, 3–4 warm, and 0–2 skip. The score is computed and never stored.

## Deviations from the prompt

1. **The `ItStore` is MySQL only.** The prompt asked for a minimal file-Store version under `it/`. The file Store's write guard allows writes only to your own folder, but an assignee edits someone else's prospect. Building cross-folder writes into a retired format was judged not worth it. `fileStore.it()` refuses with a clear message, and the `ItStore` is tested in `tests/itStore.test.ts` against MySQL instead of the shared contract suite.
2. **Category scores use the Reset's 6 factors, not the Board's 7.** The Board's factors (ticket size, gap = share with no site…) describe selling websites to local businesses and don't fit agencies.
3. **Stale windows depend on the signal type**, instead of a flat 30 days.
4. **One pre-existing end-to-end failure was fixed** in `scripts/e2e.ts`. The leads table now has "Open … in Maps" links, so two name lookups needed `exact: true`. This comes from the uncommitted lead-table changes already in the working tree, not from this feature.

## Open questions for the owner

1. Approve or reject the twelve categories and their scores, and check their Maps labels on the first runs.
2. Which automated signal sources to add, if any: SAM.gov (needs an API key) and CanadaBuys (open CSV) are the clean candidates.
3. Should a won IT prospect be handed to Leads, or stay here?
4. Should the IT finder share the lead finder's daily limit instead of having its own?
5. Phase 12's outreach half (sequences, Outreach Health, the weekly review): build it inside this area next?

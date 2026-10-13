# Famysys Outreach Kit

A web app for selling websites and software to local service businesses in the US. It ports the single-file tool
*The Territory Desk* (`docs/source/territory-desk.html`) and wraps it in a team system: accounts, six roles, saved kits,
a lead tracker and a local lead finder.

## How it runs

One server, one MySQL database, one address. Teammates open the URL and sign in like any other web app: they never clone the repo,
install anything, or sync. Only the owner has the code.

- **One MySQL database** holds everything: accounts, teams, company details, kits, leads, events, hand-offs, the audit log, playbook reads, finder
  results, sign-in attempts. Only the server can read it, so a BD can only ever receive their own leads: the `Store` filters every read by the caller's
  role before a row leaves the database.
- **Accounts the owner creates.** Username and password. The owner (and admins, below admin) create each account; the app shows a
  temporary password once; the person sets their own at first sign-in. Sessions last 14 days, and a reset, pause, turn-off or role change ends that
  person's session at their next click.
- **Six roles**: super admin, admin, manager, BD, researcher, viewer. See [docs/roles.md](docs/roles.md) (generated from the permission map).
  A BD sees only their own leads; a manager their team's; admins everyone's. Territories are shared; duplicate businesses are blocked by a unique key in the
  database, so two people adding the same business at once cannot both succeed.
- **One `Store`** (`src/lib/store/`) is the only code that touches stored data. `mysqlStore.ts` is what the app runs on; `fileStore.ts` (the old `team/` files)
  is kept as the reference implementation and as the source for the migration. Both pass the same contract tests (`tests/contract/`).
- The Kit Console, the generators, `pnpm parity`, `pnpm golden:sweep` and `CHANGES.md` are untouched.

## Owner setup

The first-time install on the Hostinger VPS, step by step, is in [docs/hostinger-install.md](docs/hostinger-install.md). To run it on your own computer:

Needs Node 22 or newer, pnpm and a MySQL 8.0 or newer you can create a database on.

```bash
pnpm install
cp .env.example .env.local     # then fill in DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
pnpm db:migrate                # creates the tables (pnpm dev also applies new migrations on start)
pnpm db:init-owner             # workspace name, studio, demo domain, your username, full name and password. Runs once.
pnpm dev                       # http://localhost:5021, then sign in
```

Then:

1. **Users → Create user** for each teammate: full name, username, role, team (create teams under Teams first). The app shows
   "Username … · Temporary password … · Sign in at …" once, with Copy. Send it to them in chat.
2. To bring over the data from the old `team/` files: `pnpm db:import-team` is a dry run that prints counts; `pnpm db:import-team --apply` writes. It only reads `team/`
   and can be run again safely. Or use **Leads → Import CSV** for leads exported earlier.

Local runs always use **port 5021**: `pnpm dev` and `pnpm start` both listen there.

## What the Kit Console does

- **Kit Console** (`/console`): category → desktop or phone → state and city → your details. It builds the same field kit as the original: searches,
  hashtags, sources, site blueprint, build prompt, 15 openers, 8 messages, pricing, upsell, cross-sell and AI ladders, and the 60-minute block.
  Saving a kit stores its inputs only (plus a title and a status) and shows the saved strip: status, counters, who else works the same
  category and city, and three next actions.
- **Playbook** (`/playbook`): a card for each of the 11 sections, a "Start here" path per role, read receipts, and required reading set by managers and admins.
- **Leads**: one row per business with the 28 sheet columns, the scorer, the 8 pipeline stages, next actions from the Day 0/2/5/9/14/45 sequence, live
  ratios, and a CSV export (own, team or all, by role; every export is logged) with the original's exact 28-column header.
- **Hand-offs**: researchers' leads wait in an unassigned queue; a manager (their team) or an admin assigns each to a BD, who accepts it. A leaver's open leads
  are handed over the same way before their account is turned off.
- **Lead finder** (optional): a Playwright-driven Chromium searches Google Maps for "category in city, ST", opens each listing and saves the ones that
  show no website into the runner's own folder. See below.

The app sends no email and fetches no third-party site, except the optional **lead finder**, where a browser on the server reads Google Maps.

## Setup details

| Variable | What it is |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | The MySQL database. Required. Set in `.env.local` locally, in the service's environment on the server. Never committed |
| `SESSION_SECRET` | Signs session cookies. 32 or more characters; **required in production** (`NODE_ENV=production`). In development a random one is kept in `.local/session-secret` |
| `SCRAPE_HEADED` | Optional: `1` shows the lead finder's browser window when started from the console |
| `OKIT_ALLOW_CLOCK_OVERRIDE`, `OKIT_CLOCK_OFFSET_MS` | Test only (`pnpm e2e` sets them): move the app's clock. Never set these on the server |

Database commands: `pnpm db:migrate` (apply new migrations, safe to repeat), `pnpm db:init-owner` (once), `pnpm db:import-team [--from <folder>] [--apply]` (copy the old `team/` files in), `pnpm db:backup [--dir <folder>] [--keep <days>]` (a compressed `mysqldump`; deletes its own backups older than 14 days by default).
The session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` whenever `NODE_ENV=production`.

### Local lead finder (optional)

Finds local businesses that have no website, for free, using Chromium on the machine the app runs on. The super admin can switch it off for the workspace (Feature switches). On a datacentre server (a VPS) Google may block or CAPTCHA the requests; see docs/hostinger-install.md step 7.

```bash
pnpm exec playwright install chromium      # once (on a server: pnpm exec playwright install --with-deps chromium)
pnpm dev
```

In the console (or **Lead finder** for researchers), pick a category and a state and city. A "Find businesses without a website" section appears: choose
**Today's limit** (20, 50, 70 or 100) and click **Find businesses**. Progress streams in as "Checked 23 · no website 9 · saved 7 · skipped 14 with a website". Results are saved to
your own finder list in the database, and **Move to Leads** copies a row into your leads (a business that is already someone's lead is refused with their name).
From the terminal: `pnpm scrape "Roofing" "Dallas" TX --as ravi --limit 50` (add `--headed` to watch the browser).

- **What it reads.** Google Maps only. For each listing it saves what the listing itself shows (name, phone, address, rating, review count when shown, email, Facebook,
  Instagram, other social and booking links). A listing with a Website row is skipped, and so is one whose only link is a booking link on the business's own domain.
- **Today's limit** is a ceiling on new businesses saved per local calendar day by that person. A business already found by anyone, or already a lead, is skipped and does not count.
- **Politeness.** One browser, one tab, a random 2–5 second pause before each listing it opens. A CAPTCHA, "unusual traffic" page or consent page that one normal click does not clear ends the run at once.
  Nothing is retried. No proxies, no CAPTCHA solving, no stealth plugins.
- **When Google changes its page**, the only file to fix is `src/lib/scrape/selectors.ts`. `tests/fixtures/maps/` holds saved panels the parser is tested on.
- Google's terms restrict automated access to Maps. This is for light, personal use on your own machine.

## Tests and checks

| Command | What it checks |
|---|---|
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | TypeScript (strict), ESLint, production build |
| `pnpm test` | `pnpm secrets:check`, then unit tests: the permission matrix, the Store contract suite on both the file Store and the MySQL Store, the MySQL-only checks (unique keys, locks, sessions), the `team/` import, auth, the golden tests, and (with Chromium installed) the lead finder against a local stand-in for Maps (no request goes to Google). The MySQL tests need `DB_*` set (from `.env.local`); each makes and drops its own `okit_test_*` database, so the user needs CREATE and DROP on `okit_%`. Without `DB_*` they are skipped with a warning |
| `pnpm secrets:check` | Fails if a session secret, a plain-text password field or a `.env` file is tracked |
| `pnpm roles:doc` | Regenerates `docs/roles.md` from the permission map; a test fails if it is stale |
| `pnpm parity` | Parses the original HTML and compares every extracted constant and all prose with `src/data` and `src/content`. Writes `docs/parity-report.md`. Exits non-zero on any mismatch |
| `pnpm golden:sweep` | Builds the kit in the original page and in the TS port for all 124 categories × both devices and compares them |
| `pnpm golden:record` | Re-records `golden/original/*.json` from the original page (needs Playwright's Chromium) |
| `pnpm e2e` | Builds the app once, then runs **one instance** (port 5021) on a throwaway MySQL database and drives it as two people: the console, board and theme; the owner creates a BD; the BD signs in from a second browser, is forced to change the temporary password, builds Roofing in Dallas, TX, saves it and adds a lead; the owner sees it at once; the BD can't open, list or export the owner's lead; five wrong passwords lock a name; a reset and a pause each end the BD's session at the next click; the session cookie is `Secure`; a clock offset shows a session open on day 13 and ended on day 14 |
| `pnpm a11y` | axe-core (WCAG 2.1 A and AA) on every screen for every role, light and dark, at 390 and 1280, plus no-horizontal-scroll and visible-focus checks |
| `pnpm brand` | No hex outside the four brand colours, no font but Jost, no weight above 500, no `<b>`, no “Jost Book” |
| `pnpm shots N [--as user] path…`, `pnpm shots:13` | Screenshots at 390px and 1280px, light and dark, into `docs/screenshots/phase-NN/`; `shots:13` covers every role |

Playwright needs a browser once: `pnpm exec playwright install chromium`.

### How the port is kept honest

- `src/data/*.ts` is generated from the original's own JavaScript by `pnpm extract:data`. `src/content/` holds the prose, extracted once
  by `pnpm extract:content` and maintained by hand. `pnpm parity` re-checks both against the original.
- `src/lib/kit/` holds the generators (`openers`, `messages`, `buildPromptText`, `sectionPlan`, `priceModel`, `marketSize`, `gapMid`,
  `makeTags`, `makeMaps`, `rotation`, `runBlocks`, and the kit assembly). They are pure and have no DOM access.
- The golden tests compare the TS port with what the original builds in a real browser, plus the three logged corrections
  (`golden/corrections.ts`). Differences from the original are limited to those corrections and are listed in [CHANGES.md](CHANGES.md),
  which `pnpm changes` generates from the same patch lists and a test keeps in sync.
- Field Kit v2 adds a category layer (`src/kits/*.json`, applied by `src/lib/kit-v2/`) on top of the port without touching it.
  The goldens and `pnpm parity` cover the original layer; `pnpm kits:check` covers the category layer, and `golden/v2` holds
  the overlay's own goldens. See [docs/category-kits.md](docs/category-kits.md) for provenance and how a file gets approved.

## Brand

The app opens in light mode (Warm White) whatever the system setting; the header button switches to the navy dark mode and remembers the choice.

Colours, fonts and logos come from the Famysys Brand Kit: four colours (Deep Enterprise Blue `#0F2A4A`, Graphite Charcoal `#2C2E33`,
Warm White `#F7F5F2`, Electric Blue `#1E6FFF`) and tints of them; Jost 400 and 500 only; logos used as files and scaled by their native
aspect ratio. Electric Blue is never used for small text: it measures 4.04:1 on Warm White, so it appears only as a ring, a dot, a rule
and the focus outline. See `/styleguide` for tokens, the type scale and every component in light and dark.

The per-family palettes in `src/data/style.ts` style the *client demo sites* the build prompt describes. They are data, not the app's UI.

## Layout

```
db/migrations/      the database schema, numbered SQL files applied once each (pnpm db:migrate)
team/               the old file data. Read only by pnpm db:import-team and the file Store's tests (see docs/team-format.md)
src/app/            routes: /login, /today, /team, /admin, /platform, /sourcing, /reports, /console, /kits, /leads, /playbook, /account
src/components/     ui/ (primitives), shell/ (header, sidebar), playbook/, console/, kit/, leads/, team/, admin/, scrape/
src/data/           the original's constants, typed
src/content/        the original's prose as structured blocks
src/lib/kit/        the kit generators (pure)
src/lib/leads/      scorer, stages, sequence dates, ratios, form parsing, CSV
src/lib/auth/       roles, the permission map, passwords, sessions, the route map, sign-in limiter, navigation
src/lib/db/         connection settings, the pool, time helpers, the migration runner
src/lib/store/      the Store: mysqlStore.ts (the app), fileStore.ts (reference), the contract types, JSON Schemas, the team/ reader and importer
src/lib/scrape/     lead finder: selectors.ts (Maps page layout), parser, duplicate key, daily limit, scraper
scripts/            extraction, parity, golden, e2e, a11y, brand check, db:migrate, db:init-owner, db:import-team, predev, secrets check
tests/contract/     the Store contract tests, run against both Stores
golden/             fixtures, recorded snapshots of the original, the corrections
docs/               hostinger-install.md, source/ (the original and the Role System page), roles.md (generated), team-format.md, archive/, parity-report.md, screenshots/
```

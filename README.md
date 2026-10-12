# Famysys Outreach Kit

A web app for selling websites and software to local service businesses in the US. It ports the single-file tool
*The Territory Desk* (`docs/source/territory-desk.html`) and wraps it in a team system: accounts, six roles, saved kits,
a lead tracker and a local lead finder.

## What changed in Phase 13

The Outreach Kit used to be one person's tool: magic-link sign-in, every row private to its owner, data in Supabase, the lead finder in MySQL.
Famysys now runs it as a team, with these constraints, so the app is now:

- **No server and no database.** Every teammate runs the app on their own Mac or Windows laptop. Supabase and MySQL are gone from the app
  (their files are kept for reference in `docs/archive/`, "Reference for a future server database. Not used by the app.").
- **Files in the repo.** Each person's work is saved as plain files in `team/data/<username>/`; the account files, teams and company details are in
  `team/`. The app's **Sync** button (and app start, and every 30 minutes) commits only the files that person may write and moves them
  through the private GitHub repo with git. Because nobody writes another person's files, syncs don't conflict. See [docs/team-format.md](docs/team-format.md).
- **Accounts the owner creates.** Username and password. The owner (and admins, below admin) create each account; the app shows a
  temporary password once; the person sets their own at first sign-in. Sessions last 14 days.
- **Six roles**: super admin, admin, manager, BD, researcher, viewer. See [docs/roles.md](docs/roles.md) (generated from the permission map).
  A BD sees only their own leads; a manager their team's; admins everyone's. Territories are shared; duplicate businesses are blocked.
- **One `Store`** (`src/lib/store/`) is the only code that touches `team/`. A server database can later replace it without touching a screen.
- The Kit Console, the generators, `pnpm parity`, `pnpm golden:sweep` and `CHANGES.md` are untouched.

## What this setup can't do

- **Logins identify people; they don't protect data.** Every laptop that pulls has every folder. The app shows a BD only their own leads, but the files are
  readable on disk in any text editor. The owner accepted this.
- **Account changes reach a laptop at its next sync**, not instantly: at app start, within 30 minutes, or when someone presses Sync. A reset, pause,
  turn-off or role change ends that person's session at that laptop's next sync.
- **The real way to remove someone** is removing their GitHub access to the repo, then turning their account off. They keep whatever was already on their laptop.
- **Duplicate checks are as fresh as the last sync.** Two people can add the same business in the same half hour; the second sync keeps both and the
  duplicate index flags it from then on.
- **Lead contact details stay in git history.** Business phone numbers and emails are in the repo's history for good. The repo must be private.

## Owner setup (once)

Needs Node 22 or newer, git and pnpm, and a **private** GitHub repo you can push to.

```bash
pnpm install
pnpm team:init          # workspace name, studio, demo domain, your username, full name and password. Writes team/. Runs once.
pnpm dev                # http://localhost:3000, then sign in
```

Then:

1. **Users → Create user** for each teammate: full name, username, role, team (create teams under Teams first). The app shows
   "Username … · Temporary password … · Ask your Claude to set up and run the Outreach Kit, then sign in at http://localhost:3000" once, with Copy.
2. Press **Sync now** (the account file goes to GitHub), push your code the way you normally do, and **add each teammate's GitHub account as a collaborator** on the repo.
3. Send each teammate their username and temporary password in chat.
4. To bring back leads you exported before this phase, use **Leads → Import CSV**. Saved kits are re-saved from the console.

The owner's code updates reach teammates by the same pull. `pnpm dev` hot reloads; if `package.json` or the lockfile changed the app shows
"Restart needed: ask Claude to restart the Outreach Kit", and `pnpm dev` runs `pnpm install` when the lockfile changed.

## Teammate setup

Teammates are not technical. They clone the repo and tell their own Claude: **"Set up and run the Outreach Kit."** Everything their Claude needs, with Mac and
Windows steps side by side, is in [CLAUDE.md](CLAUDE.md) ("Run the Outreach Kit (for a teammate's Claude)"), including the two sentences the app shows when a
sync stops: "Fix the Outreach Kit sync" and "Set up GitHub sign-in for the Outreach Kit". Nobody installs, sees or manages a database.

## What the Kit Console does

- **Kit Console** (`/console`): category → desktop or phone → state and city → your details. It builds the same field kit as the original: searches,
  hashtags, sources, site blueprint, build prompt, 15 openers, 8 messages, pricing, upsell, cross-sell and AI ladders, and the 60-minute block.
  Saving a kit writes `kits/<id>.json` (inputs only, plus a title and a status) and shows the saved strip: status, counters, who else works the same
  category and city, and three next actions.
- **Playbook** (`/playbook`): a card for each of the 11 sections, a "Start here" path per role, read receipts, and required reading set by managers and admins.
- **Leads**: one row per business with the 28 sheet columns, the scorer, the 8 pipeline stages, next actions from the Day 0/2/5/9/14/45 sequence, live
  ratios, and a CSV export (own, team or all, by role; every export is logged) with the original's exact 28-column header.
- **Hand-offs**: researchers' leads wait in an unassigned queue; a manager (their team) or an admin assigns each to a BD, who accepts it. A leaver's open leads
  are handed over the same way before their account is turned off.
- **Lead finder** (optional, local): a Playwright-driven Chromium searches Google Maps for "category in city, ST", opens each listing and saves the ones that
  show no website into the runner's own folder. See below.

The app never sends anything, sends no email, and never fetches a third-party site, except the optional **lead finder**, where a browser on your own computer reads Google Maps.

## Setup details

Needs Node 22 and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Variable | What it is |
|---|---|
| `SCRAPE_HEADED` | Optional: `1` shows the lead finder's browser window when started from the console |
| `OKIT_ROOT` | Optional: use another folder as the repo root for `team/` and `.local/` (tests and the two-laptop e2e use it) |

`.local/` holds this laptop's session secret, last-sync state and sign-in attempts. It is created on first run and never committed.

### Local lead finder (optional)

Finds local businesses that have no website, for free, on any laptop with Chromium installed. The super admin can switch it off for the workspace (Feature switches).

```bash
pnpm exec playwright install chromium      # once
pnpm dev
```

In the console (or **Lead finder** for researchers), pick a category and a state and city. A "Find businesses without a website" section appears: choose
**Today's limit** (20, 50, 70 or 100) and click **Find businesses**. Progress streams in as "Checked 23 · no website 9 · saved 7 · skipped 14 with a website". Results are written to
`team/data/<you>/finder/businesses.jsonl`, and **Move to Leads** copies a row into your leads (a business that is already someone's lead is refused with their name).
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
| `pnpm test` | `pnpm secrets:check`, then unit tests: the permission matrix, the Store, auth and sessions, sync against temporary bare repos and clones, the golden tests, and (with Chromium installed) the lead finder against a local stand-in for Maps (no request goes to Google) |
| `pnpm secrets:check` | Fails if a session secret, a plain-text password field or a `.env` file is tracked |
| `pnpm roles:doc` | Regenerates `docs/roles.md` from the permission map; a test fails if it is stale |
| `pnpm parity` | Parses the original HTML and compares every extracted constant and all prose with `src/data` and `src/content`. Writes `docs/parity-report.md`. Exits non-zero on any mismatch |
| `pnpm golden:sweep` | Builds the kit in the original page and in the TS port for all 124 categories × both devices and compares them |
| `pnpm golden:record` | Re-records `golden/original/*.json` from the original page (needs Playwright's Chromium) |
| `pnpm e2e` | Builds the app once, then runs **two copies of it on two clones of a temporary bare repo** (owner on port 3100, teammate on 3101): the console, board and theme; the owner creates a BD and syncs; the teammate's app pulls, the BD signs in, is forced to change the temporary password, builds Roofing in Dallas, TX, saves it, adds a lead and syncs; the owner pulls and sees it in Team; a reset ends the BD's session at the next pull; a clock override shows a session open on day 13 and ended on day 14 |
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
team/               the data: one folder per person (see docs/team-format.md). Committed and synced
src/app/            routes: /login, /today, /team, /admin, /platform, /sourcing, /reports, /console, /kits, /leads, /playbook, /account
src/components/     ui/ (primitives), shell/ (header, sidebar, Sync), playbook/, console/, kit/, leads/, team/, admin/, scrape/
src/data/           the original's constants, typed
src/content/        the original's prose as structured blocks
src/lib/kit/        the kit generators (pure)
src/lib/leads/      scorer, stages, sequence dates, ratios, form parsing, CSV
src/lib/auth/       roles, the permission map, passwords, sessions, the route map, navigation
src/lib/store/      the Store: the only code that touches team/ (types, JSON Schemas, atomic writes, duplicate index)
src/lib/sync/       the git sync engine
src/lib/scrape/     lead finder: selectors.ts (Maps page layout), parser, duplicate key, daily limit, scraper
scripts/            extraction, parity, golden, e2e, a11y, brand check, team:init, predev, secrets check
golden/             fixtures, recorded snapshots of the original, the corrections
docs/               source/ (the original and the Role System page), roles.md (generated), team-format.md, archive/, parity-report.md, screenshots/
```

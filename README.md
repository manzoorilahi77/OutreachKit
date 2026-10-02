# Famysys Outreach Kit

A web app for selling websites and software to local service businesses in the US. It ports the single-file tool
*The Territory Desk* (`docs/source/territory-desk.html`) and adds accounts, saved kits and a lead tracker.

- **Kit Console** (the home page): category → desktop or phone → state and city → your details. It builds the same field kit as the original:
  searches, hashtags, sources, site blueprint, build prompt, 15 openers, 8 messages, pricing, upsell, cross-sell and AI ladders,
  and the 60-minute block. It works signed out, with bracketed placeholders.
- **Playbook** (`/playbook`): a card for each of the 11 sections, each section on its own page with previous and next links; the
  124-category board (sort, family and tier filters) and the 30-second scorer live there.
- **Accounts**: email sign-in link, no password. Your details (Step 4) are saved once. Kits are saved as inputs and rebuilt on view.
- **Leads**: one row per business with the 28 sheet columns, the scorer saved per lead, the 8 pipeline stages, next actions from the
  Day 0/2/5/9/14/45 sequence, live ratios next to the playbook targets, and a CSV export with the original's exact 28-column header.

The app never sends anything and never fetches a third-party site. Everything is copy to clipboard.

## Setup

Needs Node 22 and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Without any configuration the playbook, board and console work. To turn on accounts, kits and leads, set:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon (publishable) key. Row Level Security protects the data |

Copy `.env.example` to `.env.local`. **Never put the service-role key in the app's environment.** The app does not use it;
only the tests against the local stack do.

### Supabase (hosted)

1. Create a project. Run the SQL in `supabase/migrations/` (SQL editor, or `supabase link` then `supabase db push`).
2. Authentication → URL configuration: set the Site URL to your deployed address and add `https://YOUR-DOMAIN/auth/callback` as a redirect URL
   (and `http://localhost:3000/auth/callback` for development).
3. Authentication → Emails: paste `supabase/templates/magic_link.html` into both the **Magic Link** and **Confirm signup** templates,
   with the subject “Your Famysys Outreach Kit sign-in link”. (A first-time email gets the Confirm signup template.)
4. Deploy to Vercel with the two variables above.

### Supabase (local, no Docker)

`pnpm stack up` starts a Supabase-compatible stack: Postgres, GoTrue (auth), PostgREST and a mail catcher, behind a gateway on
`localhost:54321`. It applies the migrations and writes `.env.local`. One-time setup on macOS:

```bash
brew install postgresql@17 postgrest mailpit go
git clone --depth 1 https://github.com/supabase/auth.git .local-supabase/auth-src
(cd .local-supabase/auth-src && go build -o ../bin/gotrue .)
pnpm stack up       # also: pnpm stack down | reset | status
```

Sent emails appear at http://localhost:8025. If you have Docker, `supabase start` with the included `supabase/config.toml` works too.
After changing a migration run `pnpm stack reset` then `pnpm gen:types` (regenerates `src/lib/supabase/database.types.ts`).

## Tests and checks

| Command | What it checks |
|---|---|
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | TypeScript (strict), ESLint, production build |
| `pnpm test` | Unit tests, the golden tests, and (if the local stack is up) the database tests |
| `pnpm test:rls` | Row Level Security with two real users. Fails if the local stack is not running |
| `pnpm parity` | Parses the original HTML and compares every extracted constant and all prose with `src/data` and `src/content`. Writes `docs/parity-report.md`. Exits non-zero on any mismatch |
| `pnpm golden:sweep` | Builds the kit in the original page and in the TS port for all 124 categories × both devices and compares them |
| `pnpm golden:record` | Re-records `golden/original/*.json` from the original page (needs Playwright's Chromium) |
| `pnpm e2e` | Drives the running app (`pnpm start -p 3100`) in a browser: console, board, theme, sign in by email link, save a kit, create and score a lead, move it to Contacted, check its Day 2 next action, export the CSV |
| `pnpm a11y` | axe-core (WCAG 2.1 A and AA) on every screen, light and dark, at 390 and 1280, plus no-horizontal-scroll and visible-focus checks |
| `pnpm brand` | No hex outside the four brand colours, no font but Jost, no weight above 500, no `<b>`, no “Jost Book” |
| `pnpm shots N path…`, `pnpm shots:auth` | Screenshots at 390px and 1280px, light and dark, into `docs/screenshots/phase-NN/` |

Playwright needs a browser once: `pnpm exec playwright install chromium`.

### How the port is kept honest

- `src/data/*.ts` is generated from the original's own JavaScript by `pnpm extract:data`. `src/content/` holds the prose, extracted once
  by `pnpm extract:content` and maintained by hand. `pnpm parity` re-checks both against the original.
- `src/lib/kit/` holds the generators (`openers`, `messages`, `buildPromptText`, `sectionPlan`, `priceModel`, `marketSize`, `gapMid`,
  `makeTags`, `makeMaps`, `rotation`, `runBlocks`, and the kit assembly). They are pure and have no DOM access.
- The golden tests compare the TS port with what the original builds in a real browser, plus the three logged corrections
  (`golden/corrections.ts`). Differences from the original are limited to those corrections and are listed in [CHANGES.md](CHANGES.md),
  which `pnpm changes` generates from the same patch lists and a test keeps in sync.

## Brand

The app opens in light mode (Warm White) whatever the system setting; the header button switches to the navy dark mode and remembers the choice.

Colours, fonts and logos come from the Famysys Brand Kit: four colours (Deep Enterprise Blue `#0F2A4A`, Graphite Charcoal `#2C2E33`,
Warm White `#F7F5F2`, Electric Blue `#1E6FFF`) and tints of them; Jost 400 and 500 only; logos used as files and scaled by their native
aspect ratio. Electric Blue is never used for small text: it measures 4.04:1 on Warm White, so it appears only as a ring, a dot, a rule
and the focus outline. See `/styleguide` for tokens, the type scale and every component in light and dark.

The per-family palettes in `src/data/style.ts` style the *client demo sites* the build prompt describes. They are data, not the app's UI.

## Layout

```
src/app/            routes: / (Kit Console), /playbook and /playbook/[section], /kits, /leads, /account, /login, /styleguide
src/components/     ui/ (primitives), playbook/, console/, kit/, leads/, account/
src/data/           the original's constants, typed
src/content/        the original's prose as structured blocks
src/lib/kit/        the kit generators (pure)
src/lib/leads/      scorer, stages, sequence dates, ratios, form parsing, CSV
src/lib/supabase/   clients, middleware, generated database types
supabase/           migrations, config, email template
scripts/            extraction, parity, golden, e2e, a11y, brand check, local stack
golden/             fixtures, recorded snapshots of the original, the corrections
docs/               source/ (the original), parity-report.md, screenshots/
```

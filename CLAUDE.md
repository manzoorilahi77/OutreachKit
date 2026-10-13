# Famysys Outreach Kit

A web app a small team uses to sell websites and software to local service businesses. It runs as **one server with one MySQL database** (a Hostinger VPS in
production). Teammates open a URL and sign in; they never clone the repo, install anything, pull, push or sync. **Only the owner has the code.** The data lives
only in the database, and the app returns each person only what their role allows.

The owner's Claude works on the code; read [Working on the code](#working-on-the-code-owner). The first-time server install is [docs/hostinger-install.md](docs/hostinger-install.md).

---

## Running it

- **Local:** needs Node 22+, pnpm and a MySQL 8.0+ you can create a database on. Copy `.env.example` to `.env.local` and fill in `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
  `DB_PASSWORD`. Then `pnpm install`, `pnpm db:migrate`, `pnpm db:init-owner` (once), `pnpm dev`. **Always use port 5021** for anything local: `pnpm dev` and `pnpm start` listen
  there, and `pnpm e2e`, `pnpm a11y` and the screenshot scripts use it too.
- **Server:** `pnpm build`, then `pnpm start` under pm2 or systemd behind Nginx or Caddy with HTTPS. `SESSION_SECRET` (32+ characters) must be set; the app refuses to run without it.
- **Environment variables:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`; optional `SCRAPE_HEADED`. Test only: `OKIT_ALLOW_CLOCK_OVERRIDE`, `OKIT_CLOCK_OFFSET_MS`.
  They come from the environment or `.env.local`, never from a committed file. `.env.example` lists the names with placeholders.
- **Database commands:** `pnpm db:migrate` (apply `db/migrations/*.sql`, safe to repeat), `pnpm db:init-owner` (first owner, once), `pnpm db:import-team [--from <folder holding team/>] [--apply]`
  (copy the old `team/` files into MySQL; a dry run by default; only reads `team/`; safe to repeat), `pnpm db:backup [--dir <folder>] [--keep <days>]` (compressed `mysqldump`, old ones deleted).

What to never do:

- Never print, log, save or commit a password or a secret. Only bcrypt hashes are written. `.env*` (except `.env.example`) and `.local/` are never committed.
- Never edit or delete `team/`: it is the migration source. The importer and the file Store only read it.
- Never edit a migration that has run anywhere; add a new numbered file. `pnpm db:migrate` refuses an edited one.

---

## Working on the code (owner)

Commands: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm db:migrate`, `pnpm db:init-owner`, `pnpm db:import-team`, `pnpm db:backup`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm parity`, `pnpm golden:sweep`, `pnpm brand`, `pnpm a11y`, `pnpm e2e`, `pnpm secrets:check`, `pnpm roles:doc`.

How it fits together:

- The data is in MySQL (schema: `db/migrations/`). `src/lib/store/` is the **only** code that touches stored data; pages and actions call the `Store` (`createStore(actor)` from `@/lib/store`), never SQL or `fs`.
  `mysqlStore.ts` is what the app runs on. `fileStore.ts` (the old `team/` files, format in `docs/team-format.md`) stays as the reference implementation and the source for `pnpm db:import-team`.
  Both pass `tests/contract/storeContract.ts`; a change to Store behaviour goes into that suite so both stay in step. Duplicate leads are stopped by a unique key (`lead_keys`), not only by a check.
- Roles and permissions live in `src/lib/auth/permissions.ts` (generated reference: `docs/roles.md`; source of truth: `docs/source/roles-system.html`). Code asks `can(session, "users.reset_password")`, never `role === "admin"`. Every page calls `requirePerm()` and every server action `checkPerm()`.
- Categories: the port's 124 (`src/data/board.ts`) plus the catalogue in `src/lib/kit/extBoard.ts` (healthcare and mid-size rows, display families, business size, country fit). Code asks `ALL_CATS` / `findCategory`, and uses `CATS` only where it means the port (parity, golden sweep). Analysis: `docs/expansion/category-analysis.md`.
- Countries: `src/lib/market/` holds the regions (US states, Canadian provinces, UAE emirates), currency conversion, and `applyMarket`, the last layer over a kit (after `applyCategoryKit`). Design: `docs/superpowers/specs/2026-10-13-size-country-healthcare-design.md`.
- `src/lib/db/` holds the connection settings, the shared pool, time helpers and the migration runner. Timestamps are UTC `DATETIME(3)`, dates `DATE`; the app speaks ISO strings.
- Sessions: 14 days from sign-in, signed cookie (`HttpOnly`, `SameSite=Lax`, `Secure` in production), re-checked against the user row on every request, so a reset, pause, turn-off or role change ends the session at the next click.
  The sign-in limiter (5 failures in 15 minutes lock a name) and the last sign-in time are in the database.
- The `sync.run` permission and its row in `docs/roles.md` are kept unchanged but do nothing: the sync feature is gone. Removing the key is a separate decision.

Guardrails:

- The port is untouched: don't edit `generateKit`, `openers`, `messages`, `buildPromptText`, `src/data`, `src/content`, `SEQUENCE` in `src/lib/leads/sequence.ts`, `applyCategoryKit` or `src/kits/*.json`. `pnpm parity`, `pnpm golden:sweep` and `CHANGES.md` must show no changes. (One exception, made for the countries work: `buildContext` and the helpers look regions up in `REGIONS` and honour a catalogue row's `arch`/`care`; for every port input the output is identical, which the golden sweep proves.)
- The Kit Console keeps its four steps and its output; only its props change. Saved kits store inputs only.
- Only bcrypt hashes are written. Never log a password. `.local/` and `.env*` are never committed.
- Brand: four colours, Jost 400/500, no `<b>`, Electric Blue never for small text. `pnpm brand` must pass.
- Every script is Node (`tsx`). No shell scripts, no Mac-only tools, `path.join` everywhere. The browser scripts and the MySQL tests each make a throwaway `okit_*` database and drop it; the DB user needs CREATE and DROP on `okit_%`.

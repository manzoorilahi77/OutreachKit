# Famysys Outreach Kit

A web app a small team runs **on their own laptops** to sell websites and software to local service businesses. There is no server and no database. Each person's work is saved as plain files in `team/data/<username>/`, and the app's **Sync** button moves those files through this private GitHub repo with git. Mac and Windows are both supported. Every script is Node (`tsx`).

Two readers use this file:

- **A teammate's Claude** that is asked to set up and run the app: read the next section and nothing else.
- **The owner's Claude** working on the code: read [Working on the code](#working-on-the-code-owner).

---

## Run the Outreach Kit (for a teammate's Claude)

You know nothing about this project. The person you are helping is **not technical** and has been sent a **username and a temporary password** by the owner. Your job: get the app running on their computer and tell them where to sign in. Say what you are doing in plain words, one short step at a time. Never ask them to type commands; run them yourself.

What you must never do on a teammate's computer:

- Never edit code, change any file outside `team/data/<their username>/`, or commit anything else. The app's Sync commits only their own folder.
- Never run `pnpm team:init` (the owner ran it once), never create accounts, never install or configure a database (there is none).
- Never print, log, save or commit anyone's password. If you must mention the temporary password, say it only to this person, in this chat.

The repo address and the person's username come from the owner's message. If you don't have the repo address, ask the person for it.

### 1. Check Git, Node 22 or newer, and pnpm

Run `git --version`, `node --version` and `pnpm --version`. Install only what is missing.

| | Mac | Windows (PowerShell) |
|---|---|---|
| Git | `xcode-select --install` (also gives `git`). Wait for it to finish. | `winget install Git.Git` |
| Node 22+ | Install Homebrew if `brew` is missing (from brew.sh), then `brew install node@22` and `brew link --overwrite --force node@22` | `winget install OpenJS.NodeJS.LTS` |
| pnpm | `npm install -g pnpm` | `npm install -g pnpm` |

On Windows, **open a new terminal window after installing** so the new programs are found. Check the three versions again. Node must print `v22` or higher.

### 2. Get the code and sign in to GitHub

The person needs a GitHub account that the owner has added to the private repo. If cloning says "repository not found" or asks for a sign-in that fails, tell the person: *"Ask the owner to add your GitHub account to the repo, then tell me when they have."*

| | Mac | Windows |
|---|---|---|
| Sign in | `brew install gh` if missing, then `gh auth login` (GitHub.com, HTTPS, "Login with a web browser"), then `gh auth setup-git` | Nothing to install. Git Credential Manager opens a browser sign-in the first time git talks to GitHub (the clone below). |
| Clone | `git clone <repo address> OutreachKit` | `git clone <repo address> OutreachKit` |

Then `cd OutreachKit`. Tell the person when the browser asks them to sign in to GitHub and approve.

### 3. Install

```
pnpm install
```

Only if the person will use the **lead finder** (every role except Viewer can; ask if unsure) and wants it now: `pnpm exec playwright install chromium`. Skip it otherwise; it can be done later.

### 4. Run it

```
pnpm dev
```

Leave it running. It pulls the latest accounts and code first, then starts. Open **http://localhost:3000** and tell the person:

> Sign in with the username and temporary password the owner sent you. The app will then ask you to choose your own password (10 or more characters). After that you land on your home page. Press **Sync now** at the top whenever you want your work to reach the team; it also syncs by itself every 30 minutes.

If the page says "Restart needed: ask Claude to restart the Outreach Kit", stop `pnpm dev` and run it again (the owner changed the code or its packages).

If sign-in says *"That username and password don't match, or the account is not active"*: check the username is typed in lower case, then tell the person to ask the owner. The owner may not have synced the new account yet (accounts reach a laptop at its next sync, so `git pull` and try again), or the account is paused.

### 5. "Fix the Outreach Kit sync"

The Sync control shows this sentence when two changes clashed or something stopped the sync. **Nothing is lost**; the person's work is in files. Do these steps in order, from the repo folder. `<username>` is the person's username; `<branch>` is the output of `git rev-parse --abbrev-ref HEAD` (normally `main`).

1. Stop any half-finished git operation. Ignore errors from these two:
   `git rebase --abort` and `git merge --abort`
2. **Make a safety copy of their own folder outside the repo**:
   - Mac: `cp -R team/data/<username> ~/outreachkit-backup-<username>`
   - Windows: `Copy-Item -Recurse team\data\<username> $HOME\outreachkit-backup-<username>`
3. `git fetch origin`
4. Take everything from GitHub, including `team/users/` (the accounts) and the code: `git reset --hard origin/<branch>`
5. Put their own folder back over the top, so **their version wins**:
   - Mac: `cp -R ~/outreachkit-backup-<username>/. team/data/<username>/`
   - Windows: `Copy-Item -Recurse -Force $HOME\outreachkit-backup-<username>\* team\data\<username>\`
6. Tell the person to press **Sync now** in the app. It commits their folder and pushes.
7. If the sync still fails, show them the message the app displays and tell the owner. Do not try other git commands.

The safety copy stays on their computer; leave it there.

### 6. "Set up GitHub sign-in for the Outreach Kit"

The sync was refused because this computer isn't signed in to GitHub (or the sign-in expired, or the account lost access).

- **Mac:** `gh auth status`. If it says not logged in: `gh auth login` (GitHub.com, HTTPS, web browser), then `gh auth setup-git`.
- **Windows:** run `git push` once from the repo folder, or `git credential-manager github login`; a browser window opens for GitHub sign-in. If Git Credential Manager is missing, reinstall Git with `winget install Git.Git`.
- Then ask the person to press **Sync now**. If GitHub says "repository not found" after a clean sign-in, the owner hasn't added their GitHub account to the repo yet.

### What the person should know

- Their leads, kits and notes are saved in `team/data/<their username>/` on this computer and shared with the team when they sync. Their leads are shown only to them, their manager and admins in the app, but the files are plain text on every laptop.
- If they lose connection nothing is lost; the next sync catches up.
- To stop the app, close the terminal window or press Ctrl+C in it. To start again, `cd OutreachKit` and `pnpm dev`.

---

## Working on the code (owner)

Commands: `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm parity`, `pnpm golden:sweep`, `pnpm brand`, `pnpm a11y`, `pnpm e2e`, `pnpm secrets:check`, `pnpm roles:doc`.

How it fits together:

- `team/` is the data (see `docs/team-format.md`). `src/lib/store/` is the **only** code that touches it; pages and actions call the `Store`, never `fs`. A server database can later replace the file Store without touching a screen.
- Roles and permissions live in `src/lib/auth/permissions.ts` (generated reference: `docs/roles.md`; source of truth: `docs/source/roles-system.html`). Code asks `can(session, "users.reset_password")`, never `role === "admin"`. Every page calls `requirePerm()` and every server action `checkPerm()`.
- Categories: the port's 124 (`src/data/board.ts`) plus the catalogue in `src/lib/kit/extBoard.ts` (healthcare and mid-size rows, display families, business size, country fit). Code asks `ALL_CATS` / `findCategory`, and uses `CATS` only where it means the port (parity, golden sweep). Analysis: `docs/expansion/category-analysis.md`.
- Countries: `src/lib/market/` holds the regions (US states, Canadian provinces, UAE emirates), currency conversion, and `applyMarket`, the last layer over a kit (after `applyCategoryKit`). Design: `docs/superpowers/specs/2026-10-13-size-country-healthcare-design.md`.
- `src/lib/sync/` is the sync engine (git through `execFile`, no shell). It stages only the paths a person may write.
- Sessions: 14 days from sign-in, signed cookie, re-checked against the user file on every request.

Guardrails:

- The port is untouched: don't edit `generateKit`, `openers`, `messages`, `buildPromptText`, `src/data`, `src/content`, `SEQUENCE` in `src/lib/leads/sequence.ts`, `applyCategoryKit` or `src/kits/*.json`. `pnpm parity`, `pnpm golden:sweep` and `CHANGES.md` must show no changes. (One exception, made for the countries work: `buildContext` and the helpers look regions up in `REGIONS` and honour a catalogue row's `arch`/`care`; for every port input the output is identical, which the golden sweep proves.)
- The Kit Console keeps its four steps and its output; only its props change. Saved kits store inputs only.
- Only bcrypt hashes are written. Never log a password. `.local/` is never committed.
- Brand: four colours, Jost 400/500, no `<b>`, Electric Blue never for small text. `pnpm brand` must pass.
- Every script is Node. No shell scripts, no Mac-only tools, `path.join` everywhere.

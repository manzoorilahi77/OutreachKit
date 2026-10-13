---
name: owner-sync
description: Use only for the Famysys Outreach Kit owner (the super_admin) when they say "pull", "pull data", "sync", "sync data", "push data" or "ship it" on their own laptop. Keeps the feature_dev_main branch level with main: "pull" brings main in and sends nothing; "sync" does that first, then sends data (and, after a yes, code) to main by pull request. Teammates should use sync-data instead.
---

# Owner sync (feature_dev_main <-> main)

The owner works on **`feature_dev_main`** for everything: lead generation, kit building, and code changes. `main` is the shared copy the team reads.

First check this is the owner: `team/users/<username>.json` has `"role": "super_admin"` (the username is in `.local/sync-user` after the first run, or ask once). If it is anyone else, stop and use the **sync-data** skill instead.

## "pull" / "pull data": main -> feature_dev_main

Run `pnpm sync:cycle --pull` (first time add `--user <username>`). It moves to `feature_dev_main` (creating it from where you are if missing), fetches, and rebases onto `main`. It sends nothing. Report the sentence it prints.

## "sync" / "sync data" / "push data" / "ship it": pull first, then main <- feature_dev_main

1. Check sign-in: `gh auth status`.
2. See what code is waiting: `pnpm sync:cycle --check-code`.
   - Exit 0 ("No code changes waiting"): go to step 4.
   - Exit 2: it lists files that are not data (anything outside `team/data/<you>`, `team/users`, `team/teams.json`, `team/workspace.json`, `team/schema.json`).
3. Code is waiting. Show the owner the list, then run `pnpm typecheck` and `pnpm test` and show the result. **Ask for a yes before sending code.** Teammates' apps restart when code reaches main, so a broken commit lands on every laptop. If they say yes: commit the code on this branch (`git add` the listed files, message in their style, never `.local/` or secrets), then `pnpm sync:cycle --include-code`. If no or checks fail, send data only (step 4) and say the code stays on `feature_dev_main`.
4. Data only: `pnpm sync:cycle`. Code commits already on the branch make it stop with "files that aren't yours". That is the guard: go to step 3.
5. Tell the owner the sentence it prints.

## If it stops

Same sentences as teammates: "Fix the Outreach Kit sync" (section 5 of `CLAUDE.md`) and "Set up GitHub sign-in for the Outreach Kit" (section 6). Nothing is lost on a stop.

## Never

Push to `main` directly, force-push, or delete a remote branch without the owner saying so in that message. Guardrails in `CLAUDE.md` (the port is untouched) still apply to any code you commit.

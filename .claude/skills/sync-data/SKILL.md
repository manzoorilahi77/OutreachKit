---
name: sync-data
description: Use when a Famysys Outreach Kit teammate (BD, researcher, manager, viewer) says "Sync Data", "sync my data", "sync", "push my leads", "share my work", "get the latest", or anything meaning "send my leads and kits to the team and bring theirs back". Pulls main into the sales_outreach branch, then sends the person's own work to main by pull request. Not for the owner (use owner-sync).
---

# Sync Data (teammates)

`main` is the shared copy everyone starts from and ends at. Teammates work on one branch, **`sales_outreach`**. Leads and kits are saved there on their own laptop; this skill makes them reach `main` and brings everyone else's work in. The person is **not technical**: run every command yourself, say what you are doing in plain words, and never ask them to type one.

## Do this

1. If `git rev-parse --is-inside-work-tree` fails, you are not in the OutreachKit folder: `cd` to it first.
2. Check GitHub sign-in: `gh auth status`. If it fails or `gh` is missing, follow "Set up GitHub sign-in for the Outreach Kit" in `CLAUDE.md` (install `gh` first if needed), then continue.
3. Run the sync, from the repo folder:
   - first time on this laptop: `pnpm sync:cycle --user <their username>`
   - every time after: `pnpm sync:cycle`
   The command switches to `sales_outreach` (creating it if needed), saves their own folder `team/data/<username>/`, pulls `main` into the branch, opens a pull request into `main` and merges it. It prints one plain sentence.
4. Tell the person that sentence. If it says "Done", that is all.

## If it stops

The command prints what went wrong and, when there is one, a sentence to say to Claude.
- "Fix the Outreach Kit sync": follow section 5 of `CLAUDE.md`.
- "Set up GitHub sign-in for the Outreach Kit": follow section 6 of `CLAUDE.md`.
- "Couldn't reach GitHub": nothing is lost. Tell them to try again when they are online.
- "files that aren't yours": stop and tell them to ask the owner. Do not move or delete anything.
- Exit code 3 ("Which username is this?"): ask for their username and run the first-time form.

## Never

- Edit code, or touch any file outside `team/data/<their username>/`.
- Run other git commands to force a sync (`push --force`, `reset`, `merge`) outside the steps in `CLAUDE.md`.
- Print, save or commit a password.
- Push straight to `main`. The pull request is the only way in.

Steps for people: `docs/bd-sync-steps.md`.

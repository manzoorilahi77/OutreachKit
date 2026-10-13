# Sharing your work: sync steps

How a teammate's leads and kits reach the team. You do not type commands: Claude does.

## The idea

- **`main`** is the shared copy on GitHub. Everyone starts from it and ends at it.
- **`sales_outreach`** is your working branch on your laptop. When you add a lead or build a kit, it is saved here first.
- **Syncing** brings the latest from `main` into your branch, then sends your own work to `main` by a pull request that merges by itself. You only ever send files in your own folder, `team/data/<your username>/`.

```
 your laptop: sales_outreach  --(1) pull latest-->  from main
 your laptop: sales_outreach  --(2) pull request, auto-merged-->  main
```

## One-time setup (Claude does it)

1. The repo is cloned (see "Run the Outreach Kit" in `CLAUDE.md`).
2. GitHub CLI `gh` is installed and signed in: `gh auth login`.
3. The first sync creates `sales_outreach` for you.

## Every day

Say to Claude, in this folder: **"Sync Data"**. Any of these work: "sync", "sync my data", "push my leads", "share my work", "get the latest".

Claude runs `pnpm sync:cycle` and tells you the result:

| It says | Meaning |
|---|---|
| Done. Your work is in main | Your new leads and kits are shared and you have the team's latest. |
| Already up to date | Nothing new on either side. |
| Couldn't reach GitHub | You are offline. Nothing is lost; say "Sync Data" again later. |
| "Fix the Outreach Kit sync" | Two changes clashed. Nothing is lost. Say the sentence to Claude. |
| "Set up GitHub sign-in for the Outreach Kit" | This laptop isn't signed in to GitHub. Say the sentence to Claude. |
| files that aren't yours | Stop and tell the owner. |

The app's **Sync now** button, and its automatic sync every 30 minutes, do the same thing while you are on `sales_outreach`.

## Owner (feature_dev_main)

The owner works on `feature_dev_main` and says **"pull"** (bring `main` in, send nothing) or **"sync"** (pull, then send data to `main`; code is listed and needs a yes first). See `.claude/skills/owner-sync/SKILL.md`.

## What never happens

- Your password is never sent or saved.
- Nobody's code can reach `main` from a teammate laptop.
- Nothing goes to `main` except through a pull request.

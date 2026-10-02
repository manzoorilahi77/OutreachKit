# Field Kit v2 (Outreach Kit): run order

| Step | File | Runs in | Output |
|---|---|---|---|
| 1 | `A-generate-category-kits.md` | Claude Code, at this repo's root | Vendored theme library (C1–C50), `pnpm kits:check`, 3 pilot kits, then a **stop for review** |
| 2 | (you) | — | Read the 3 pilot files; approve them or correct the schema |
| 3 | `B-phase-11-category-kits.md` | Claude Code | Category layer in the console, direction previews, kit download, leads CSV import |
| 4 | `A-…` Step 4 | Claude Code, one family per session (or a workflow if you ask for one) | The remaining 121 `src/kits/*.json` |
| 5 | `C-cowork-daily-prospect-drafts.md` | Claude Cowork, as a scheduled task | 20 Gmail drafts plus an import CSV per run |

Step 3 can ship before step 4 finishes, because a category without a file
shows today's kit, marked "Generic kit".

## Decisions these prompts encode

- **Pre-generated JSON, not an on-device SLM.** There are 124 categories, a
  closed set. Content for a closed set is written once by a strong model,
  checked by `pnpm kits:check`, and reviewed by a person before a rep
  quotes a price from it. A small model running at request time would
  invent prices and statistics, and it would build a different kit from
  the same inputs.
- **The port stays untouched.** `generateKit`, `pnpm parity`, the goldens
  and `CHANGES.md` keep proving it matches the original. The category kit
  is a separate overlay, with its own goldens in `golden/v2/`.
- **Palettes come from base-website's 50 combos.** The build prompt already
  sends every demo to that template. A palette invented in this repo would
  be one the template can't render.
- **The three corrections in CHANGES.md bind the new content too.** The
  first DM is text only, a demo never uses the prospect's photos without
  written permission, and the planning figure for cold replies is 1–5%.
- **Cowork never touches the database.** It writes Gmail drafts and a CSV.
  You import the CSV, and RLS applies as normal.

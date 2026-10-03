# Category kits (Field Kit v2)

The Kit Console builds the ported *Territory Desk* kit and, when a category has a kit file, lays a
category layer over it. This page covers where that content comes from, how it is checked and how a
file gets approved.

## What a category kit is

One JSON file per board category, at `src/kits/<kitSlug>.json`, where
`kitSlug("Fencing & gates") === "fencing-gates"`. The contract is
[`docs/prompts/field-kit-v2/category-kit.schema.json`](prompts/field-kit-v2/category-kit.schema.json); every
description in it is an instruction to whoever writes a file.

A file holds only what is specific to the category: extra page sections, three design directions,
fifteen openers, the eight sequence bodies, pricing rules and add-ons, what else you sell, cross-sell
with and without AI, twenty software and AI products, twelve routes to a bigger buyer and the upsell
ladder. City, state, market size, device and the rep's details are computed at build time and never
stored. Prices in the call script and email are the placeholders `{Build Range}`, `{Build Price}` and
`{Care Range}`, which the engine fills from the market-scaled price model.

The port is not touched. `generateKit` still builds the original kit, the goldens in `golden/original`
and `pnpm parity` still prove it, and `CHANGES.md` stays about the three corrections. The overlay is a
separate pure function, `applyCategoryKit` in `src/lib/kit-v2/apply.ts`, with its own goldens in
`golden/v2`. A category without a file shows the original kit unchanged, marked **Generic kit**.

## Provenance

Every file was written by a model (the `provenance.generatedBy` field says which and when) from the
per-category brief in Prompt A. Nothing in a file is researched data: there are no statistics, no
market facts, no company or product names, and the price ranges are planning figures for a mid-size
US market. Rows marked `scalesWithMarket` move with the same 1.15 / 1 / 0.85 / 0.8 multiplier the
original's price model uses; monthly software and AI prices never scale.

The three corrections in `CHANGES.md` bind this content too: the first DM is text only, a demo never
uses the prospect's photos without written permission (it shows marked placeholders), and cold replies
are planned at 1–5%.

## How a file is checked

`pnpm kits:check` (also run by `pnpm test`) validates every file against the schema and then the
rules the schema can't express: identity, design directions and their contrast, placeholders, the
corrections, money caps, invented evidence (percentages, "studies", stray numbers), brand names from
`scripts/kits/deny-brands.txt`, the swap test (each pitch line must name something only this trade
has), repeats between siblings in a family, and the order of the upsell ladder. It prints
`file → rule → offending text` and one summary line per file.

## The review flag

`provenance.reviewStatus` is one of:

| Status | Meaning | Header chip |
|---|---|---|
| `unreviewed` | Written by a model and passed `pnpm kits:check`. No person has read it. | Category kit · Unreviewed |
| `spot-checked` | A person read the openers, the sequence and the pricing and fixed anything wrong. | Category kit · Spot-checked |
| `approved` | A person read the whole file and would quote its prices to a customer. | Category kit · Approved |

Every file starts `unreviewed`. Only a person sets `approved`.

## How to approve a file

1. Build the category in the console for a city you know, and read the kit top to bottom.
2. Check the prices against what you would actually charge in that trade. Change `min`/`max` in the
   file, not in the kit view.
3. Read every opener and the DM 1 body aloud. If a line could go to another trade by changing one
   word, rewrite it.
4. Set `"reviewStatus": "approved"` and `"reviewedBy": "<your name>"` (the checker refuses an approved
   file without a reviewer), then run `pnpm kits:check` and `pnpm test`. If you edited one of the
   three pilot files, its golden in `golden/v2` will fail: review the diff, then run `pnpm test -u`.
5. Commit the file on its own, so the history shows who approved what.

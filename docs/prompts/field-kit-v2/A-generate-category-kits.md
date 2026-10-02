# Field Kit v2 — Prompt A: the content pipeline (Outreach Kit)

**Run this before Prompt B.** It produces data and checks, not UI. Paste the
whole file into a fresh Claude Code session opened at the Outreach Kit repo
root (`/Users/manzoor/Documents/Projects/Famysys/OutreachKit`).

---

## What exists, and what is wrong with it for selling

The Kit Console builds a kit that matches *The Territory Desk* line for line,
and that is proven by `pnpm parity` and the golden tests. But most of the
selling content in that kit is the same for every category. Five sections
use global or family-level data:

| Kit section (`src/lib/kit/generate.ts`) | Data | Specific to |
|---|---|---|
| `upsells` "What else you sell" | `FAM[f].up` (3 rows) | family |
| `cross` "Cross-sell — new revenue" | `CROSS` (12) | nobody, it's global |
| `aiup` "Software & AI — 20 products" | `AIUP` (20) | global |
| `aicross` "12 routes to a bigger buyer" | `AICROSS` (12) | global |
| `ladder` "The upsell ladder" | `OPPS` (31) | global |

On top of that, the openers and messages are templates with the category
name dropped in, and there is one site style per family. Field Kit v2 adds
a **category layer**: one reviewed JSON file per category, applied on top
of the ported kit. **The port itself is not touched.** `generateKit`, the
goldens, `pnpm parity` and `CHANGES.md` keep proving the port matches the
original.

## The layering rule

```
original (src/data, src/content)   ← unchanged; parity + goldens guard it
  └─ family (13)     FAM, STYLE, TONE
      └─ archetype (9)  ARCH
          └─ category (124)  ← THIS PIPELINE: src/kits/<kitSlug>.json
              └─ runtime   city, state, market multiplier, device, profile
```

If a value is the same for every category in a family, it isn't category
content. If it depends on the city or the market, the engine computes it,
so it is never stored in the file.

Read these before writing anything:

- `docs/prompts/field-kit-v2/category-kit.schema.json`. This is the
  contract. Every description in it is an instruction.
- `src/lib/kit/generate.ts`, `openers.ts`, `messages.ts`, `buildPrompt.ts`.
  This is what the category layer replaces or extends.
- `CHANGES.md`. Its three corrections bind new content too: cold replies
  run 1–5%, the first DM is text only, and a spec demo never uses the
  prospect's photos without their written permission.
- `src/data/board.ts`, `fam.ts`, `arch.ts`, `cross.ts`, `aicross.ts`,
  `aiup.ts`, `opps.ts`. These are the seed lists and the quality bar.
  Specialise them; never copy a row verbatim.

---

## Step 1 — Vendor the theme library (don't invent palettes)

The build prompt already sends every demo to
`manzoorilahi77/base-website`, whose **50-combo theme system** (C1–C50,
each a 7-role palette plus one of ten typography directions, T1–T10) is
the only place a demo site gets its colours and fonts. The design
directions must choose from that system. A palette invented here is one
the template can't render.

- Write `scripts/themes-sync.ts` (`pnpm themes:sync`). It copies
  `src/themes/library.ts` from the base-website repo verbatim. Read the
  repo path from `BASE_WEBSITE_DIR`, defaulting to
  `/Users/manzoor/Documents/Manzoor Personal/BaseProjects/base-website`.
  Put the source commit hash at the top of the file. Copy `contrast.ts`
  (for `pickReadable`) as well.
- Place both copies in `src/themes/`. Do **not** put them in `src/data`,
  because `pnpm parity` treats everything in `src/data` as an extract of
  the original and would fail.
- Add `src/themes/library.ts` to `SKIP_FILES` in `scripts/brand-check.ts`,
  with the same kind of comment `src/data/style.ts` has: client demo-site
  palettes, which are data and never app UI.
- Test (`tests/themes.test.ts`): there are 50 combos and 10 type
  directions. Every `STYLE[fam][0]` in `src/data/style.ts` exists in the
  library, and its seven hex values equal the library's. If any differ,
  the original and the template have drifted. In that case, **report it;
  don't "fix" either side.**

## Step 2 — The checker: `scripts/kits-check.ts` (`pnpm kits:check`)

Add `ajv` as a dev dependency for schema validation. Also run the checker
from `tests/kits.test.ts`, so that `pnpm test` gates it. It prints
`file → rule → offending text` and exits non-zero on any failure.

| Rule | Check |
|---|---|
| Schema | Every `src/kits/*.json` file validates |
| Identity | `category` exists on the board; `slug === kitSlug(category)`; `kitSlug` is unique across all 124 categories (test it over the whole board, including the ones with no file yet) |
| Directions | Every `themeId` exists in the library. The three directions use three different themeIds and at least two different type directions. One direction is `standard`. Report (don't fail) when no direction uses the family's current `STYLE` themeId |
| Contrast | Each chosen combo's text/bg ratio is ≥ 4.5, and `pickReadable` gives a CTA label at ≥ 4.5 on the accent. Use `src/lib/contrast.ts` |
| Placeholders | Only the whitelisted braces. Each `linkLine` contains `{demo-link}` exactly once. No opener `line` and no `dm1` contains a link, `{demo-link}` or the words "screenshot", "attached" or "image" |
| Correction 3 | No text says the demo contains their photos ("your photos", "your own photos", "photos from your Instagram") unless it is the phrase "marked placeholders where your photos would go" |
| Money | `min ≤ max`. Monthly ≤ 2,500; one-time ≤ 40,000. `pricing.lineItems` never names a build tier or the care plan |
| No invented evidence | Flags `%`, "studies", "research shows", "on average", "statistic", "proven", "guarantee", "double your", "10x", and any digit that isn't a price, a day count, a duration or a count of photos/pages |
| No brand names | Flags names from `scripts/kits/deny-brands.txt` (third-party software, marketplaces, AI vendors, lead platforms) |
| Swap test | Every opener `line`, pitch line and `pageStructurePlus.section` must contain at least one of the category's own nouns (its `q` search terms and `t` hashtag stems, de-pluralised) or a term listed in `pageStructurePlus`. If it doesn't, flag it as **generic**. Allow at most 3 generic lines per file |
| No repeats | Within a family, flag any opener or pitch line with a token-Jaccard similarity of 0.6 or more to a line in a sibling's file |
| Ladder | Rung 1 has `day: 0`, and days never decrease |

End with one summary line per file, for example
`✓ fencing-gates  15 openers · 20 products · 12 routes · 1 generic · 0 repeats`.

## Step 3 — Pilot three, then STOP

Write these three files, which are the golden fixtures' categories, so a
reviewer can compare v1 and v2 side by side:

- `Fencing & gates` (out, quote)
- `Hair salons & suites` (care, book)
- `Commercial janitorial` (b2b, rfq)

Run `pnpm kits:check` until it is clean. Then **stop**, and report the
three files in full, plus every place the schema fought the content. Fix
the schema now; changing it after 124 files exist is expensive.

## Step 4 — The batch (only after the pilot is approved)

Work family by family, so that siblings are written side by side and the
repeat check means something. Start with the families of Tier A
categories.

If the user has explicitly asked for a workflow or parallel agents, use
one agent per family (13 in all). Each agent writes its family's files in
sequence, reads its siblings as it goes, and runs `pnpm kits:check` before
returning. Otherwise, do one family per session.

---

## The per-category brief

Give this section verbatim to every agent that writes a kit file.

**Reader:** a junior US sales rep who has never worked in this trade.
**Customer:** an owner-operator with $150k–$2M revenue who does physical
work and has no time. Write owner-to-owner: plain, calm and specific. Use
the family's `TONE`, and keep each line to one or two sentences.

**The swap test, for every line:** if you could send this line to a
different trade by changing one word, rewrite it. Specific means it names
something only this trade has: its jobs, materials, seasons, failure
modes, customer moments, licences or tools.

1. **`pageStructurePlus` (4–6).** Sections this trade needs beyond the
   archetype's and the family's. For fencing, that might be a material
   comparison page, HOA and permit help, or gate automation. Each `why`
   says how this trade's customers actually decide.

2. **`designDirections` (exactly 3).** These must be genuinely different
   **site types**, not three colourways. Typically one `local-conversion`
   at `starter`, one `portfolio-showcase` or `booking-first` at
   `standard`, and one `premium-brand` or `editorial-trust` at `premium`.
   Choose combos from `src/themes/library.ts` whose `bestFor`, mode and
   type direction suit this trade. Prefer the family's current combo for
   the `standard` direction unless the category clearly needs something
   else, and if it does, say why in `whyItFits`. Write `headlineSample`
   the way this trade's best operator would say it, with `{City}`.

3. **`openers` (15), each from a different angle.** Each angle maps to
   something visible on the prospect's profile: no Website button, a
   Facebook-only link, a dead free host, broken on a phone, no quote form,
   good photos with nowhere to live, reviews that never reach a site, a
   seasonal moment, after-hours calls, a hiring post, the service area,
   financing, licence and insurance trust, referral-only risk, a specific
   recent job.
   - `line` is what gets sent as a first DM. It has **no link, and no
     reference to a screenshot or image**.
   - `hook` says what to find first. It can say "screenshot it for when
     they reply", but never "attach it".
   - `linkLine` carries `{demo-link}`.

4. **`sequence`.** Write bodies for the original's eight blocks:
   - `dm1` is text only: one true observation and one question.
   - `dm2` is the first message with `{demo-link}`.
   - `call` is a short script.
   - `objections` are 4–8 that this trade actually raises (for example
     "I get all my work from referrals", "my nephew does my website",
     "it's my slow season", "I'm on a lead platform already").
   - `email` goes to the public business address.
   - `voicemail` runs 15 seconds.
   - `takedown` is a polite close.
   - `nurture` is for day 45.

   The demo uses **marked placeholders where their photos would go**.
   Never say it contains their photos.

5. **`pricing`.** Write 5–7 plain rules for pricing *this* trade, for
   example "Price the gallery by project count, not page count". Then list
   the add-on `lineItems`, each with a `description` saying **what pushes
   it to the max**. Set `scalesWithMarket: true` for labour-shaped work
   and `false` for subscriptions.

6. **`whatElseYouSell` (6–10).** Marketing and presence work for the same
   client: photo days, Google profile management, a review engine, city
   pages, signage and wrap coordination, seasonal campaigns. Include only
   what this trade actually buys.

7. **`crossSell`.** These are **different buyers reached through this
   client's trust**. The original defines it this way: "Upsell is more
   money from the same buyer. Cross-sell is a different buyer you can
   only reach because this client trusts you."
   - `withoutAI` (6): sites, booking or quoting for their subs, suppliers,
     referral partners, the neighbours on the job.
   - `withAI` (6): AI-shaped products for those same buyers.
   - Name `whoPays` concretely.

8. **`softwareAI` (20).** Products for the **same** client: about 8
   software, 8 AI and 4 automation, easiest first sale first. Prices must
   make sense against the category's `tkt`. A trade with $300 jobs doesn't
   buy a $15k build. `whenAndWhatItTakes` names the month and the inputs.
   Every AI item states it comes with a maintenance retainer, which is the
   original's rule.

9. **`routesToBiggerBuyer` (12).** Routes **beyond this client** that turn
   one build into many: productise it for every operator in the trade,
   trade associations, supplier dealer networks, franchise groups, agency
   white-label, and so on.

10. **`upsellLadder` (6–8 rungs).** Start at day 0 with the build plus
    care plan on the same contract. Each `trigger` is an observable event
    (for example "60 days of form data", "they mention a second crew"),
    not just a date.

**No overlap:** an item lives in exactly one of blocks 6–9. The ladder may
name items from them.

**Never write:**

- Statistics, percentages, or any number stated as a market fact. Those
  are the numbers that get invented.
- Guaranteed outcomes.
- Real company, product, platform or competitor names.
- Claims about the prospect that aren't visible on their public profile.
- Anything that says the demo contains their photos.

**Header:** set `provenance.reviewStatus` to `"unreviewed"`. Only a human
sets `approved`.

---

## Definition of done

```bash
pnpm themes:sync && pnpm kits:check
pnpm typecheck && pnpm lint && pnpm test && pnpm parity && pnpm brand
ls src/kits | wc -l          # 3 after the pilot; 124 after the batch
du -sh src/kits
```

`pnpm parity` and the golden tests must pass **unchanged**. If either
fails, something in the port was touched, and that is a bug in this run.

**Report back:**

- the checker summary
- the folder size
- any theme drift Step 1 found
- every price range you widened because you were unsure

# Phase 11 — Field Kit v2: the category layer in the Kit Console

**Prerequisite:** commit `ca151d8` ("Kit Console is the home page…") or later,
and Prompt A run at least through its pilot. That means
`src/themes/library.ts` exists, `src/kits/` holds the three pilot files, and
`pnpm kits:check` passes.

**What this phase builds.** When a category has a kit file, the console
shows a kit that is specific to that category:

- the page structure, plus a "Plus, for <category>" block
- three **design directions**, drawn as live previews in the template's
  own palettes and fonts, chosen *before* the build prompt
- a build prompt rewritten around the chosen direction
- fifteen category openers and the eight sequence blocks, written for the
  category
- what to charge, as rules plus one min/max table
- what else you sell
- cross-sell with and without AI
- 20 software & AI products
- 12 routes to a bigger buyer
- the upsell ladder

Two extras feed the Cowork task in Prompt C: a **kit download** (.md) and a
**leads CSV import**. Without a kit file, the console behaves exactly as it
does today.

## Guardrails

- **The port is untouched.** Don't edit `generateKit`, `openers`,
  `messages`, `buildPromptText`, `src/data` or `src/content`. The golden
  tests, `pnpm golden:sweep` and `pnpm parity` must pass with no changes to
  `golden/` or `CHANGES.md`. The category layer is a separate function
  applied to the ported kit.
- **CHANGES.md stays about the three corrections.** Category content is new
  writing, not a correction to the original. Document it in a new
  `docs/category-kits.md` (provenance, the review flag, how to approve a
  file), and add one paragraph to README's "How the port is kept honest":
  goldens and parity cover the original layer; `pnpm kits:check` covers
  the category layer.
- **Brand rules still bind the app's UI.** Demo palettes and fonts appear
  only inside the preview canvas. Exempt exactly two paths from
  `pnpm brand`: `src/themes/library.ts` (from Prompt A) and
  `src/components/kit/directions/` (the canvas and its font loaders). Give
  each exemption a comment, and add a test asserting that `SKIP_FILES` and
  the skipped directories are exactly that set plus what was there before.
- **No runtime fetch of a third-party site.** Preview fonts use
  `next/font/google`, which downloads them at build time and serves them
  from the app. Use `preload: false`, `display: 'swap'` and Latin subsets,
  copying the pattern in base-website's `src/themes/fonts.ts` and the
  reason it gives. Never use a `<link>` to fonts.googleapis.com.
- **Never sends anything.** The import only reads a file you give it, and
  the download only writes a file.
- **RLS stays the security boundary.** The new column and the import go
  through the user's session client. The service-role key is never used.

---

## Step 1 — Types and loading (`src/lib/kit-v2/`)

- `types.ts`: a `CategoryKit` type that mirrors the schema exactly, plus
  `kitSlug(name)` as defined in the schema's description.
- `load.ts`: `loadCategoryKit(catName): Promise<CategoryKit | null>`. It
  uses a dynamic `import(\`@/kits/${slug}.json\`)` so that each category
  is its own chunk, never all 124 bundled together. It returns `null` when
  the file is missing; that is a normal state while Prompt A is still
  running. It works both in the client console and in the server page
  `/kits/[id]`.
- `themes.ts`: `resolveDirection(ck, id)` returns the combo from
  `src/themes/library.ts`, with its seven colours, type direction, display
  and body family keys, and `pickReadable` CTA label colour.

## Step 2 — The overlay: `applyCategoryKit(kit, X, ck, dir)`

This function is pure. Its inputs are the kit from `generateKit`, the
context from `buildContext`, the category kit, and the direction id
(default `'b'`). It returns a new `Kit`. Keep every one of the original's
explanatory paragraphs; replace only the data.

| Section id | What changes |
|---|---|
| header | One extra chip: "Category kit · Unreviewed" / "· Spot-checked" / "· Approved". With no file: "Generic kit". |
| `site` | After the "Plus, specific to …" steps, add an `h4` "Plus, for <category>" and steps `★1…`, each shown as **section**, then contains, then why. |
| **new** `directions`, inserted before `prompt` | A new node `{ k: "directions", items, selected }`. See Step 4. |
| `template` | "Theme to set" shows the selected direction's themeId and name. |
| `prompt` | `buildPromptTextV2` (Step 3). The copy label adds " · Direction <A/B/C> <name>". |
| `openers` | Category openers. `{demo-link}` becomes `X.demo`. The tuple shape `[angle, line, hook, link]` stays the same, so both copy buttons (Correction 2) work unchanged. |
| `sequence` | The same eight labels as `messages(X)`, so days and channels stay in sync with `src/lib/leads/sequence.ts`, with the category bodies. The objections render as "**Objection** — handler" pairs inside the objection block. The email block becomes `Subject: …` plus the body. |
| `pricing` | Show the category's `bullets` as the list, replacing the six original rules **only where** they say the same thing. Keep the anchor rule, deposit, rush, never-discount and market lines; they're the original's. The table is the original six rows unchanged, then one row per `lineItems` entry, scaled. Use the columns "Tier / item", "Min", "Max", "What moves it". |
| `upsells` | The category's `whatElseYouSell` replaces the family's three. Seasonality stays. |
| `cross` | A new node `{ k: "tabs", tabs: [{ label: "Without AI", table }, { label: "With AI", table }] }`. Both tables use the original's five columns. Keep the original's two rules paragraph. |
| `aiup` | The category's 20 rows. Add a `kind` chip before each name. The heading count comes from the data, as it does today. |
| `aicross` | The category's 12. The ownership paragraph stays. |
| `ladder` | A new node `{ k: "ladder", rungs }`: a numbered vertical list showing Day N, the offer, the range and unit, "Pitch when: trigger", and the line. Keep the original "Sell in order…" paragraph under it. |
| `snapshot`, `maps`, `instagram`, `sources`, `seeds`, `block` | Unchanged. |

**Scaling.** Factor out the existing multiplier expression in
`buildContext` (`msMult >= 90 ? 1.15 : …`) into an exported
`priceMult(msMult)`. This must not change any output, and the goldens prove
it. Rows with `scalesWithMarket` true (or with no flag and a unit of
one-time, per-job or per-shoot) are multiplied by that factor and rounded
to the nearest 50. Monthly software and AI prices never scale.

**Text and copy.** Extend `src/lib/kit/text.ts` (`kitText`) to flatten the
three new node kinds. Then "copy" and the download (Step 6) include them,
and a v2 kit can be snapshot-tested the way v1 is.

## Step 3 — `buildPromptTextV2(X, ck, dir)`

Start from the v1 text (`buildPromptText(X)`) and make exactly three edits:

1. After the "Specific to this trade — fold these into the sections above"
   list, add "Specific to <category> — add these sections", followed by
   `pageStructurePlus` as `- Section: contains (why)`.
2. In "Style", replace the `themeId '…'` sentence with the direction's
   combo: themeId, name, mode, the seven values, and the type direction's
   id, name and fonts. Keep the rule "The template owns these values —
   consume them through its tokens, never restate them" word for word.
3. At the end of "Style", add the site type, the hero layout ("adapt the
   template's Hero to a <heroLayout> composition; do not add a second hero
   component") and the mood words.

Tests:

- `buildPromptTextV2` with direction b, when b's themeId equals the
  family's STYLE combo and `pageStructurePlus` is empty, returns v1 text
  byte for byte.
- Changing the direction changes only the Style chunk.
- The Correction 3 photo constraint is still present, word for word.

## Step 4 — The direction picker

This lives in `src/components/kit/directions/`.

- Show three cards: side by side at 1280px or wider, stacked at 390px with
  the selected card first. Each card contains:
  1. A **Phone / Desktop** segmented toggle (use the existing `Segmented`).
  2. A **live miniature homepage**, drawn in HTML/CSS, with no images and
     no iframes. Its colours come from the combo's seven roles, set as CSS
     custom properties on the canvas element only. Its fonts are the
     combo's display and body families, loaded via the
     `next/font/google` loaders in this folder. The page shows:
     - a nav with a type-set wordmark and a tap-to-call pill
     - a hero in `heroLayout`, where photo slots are tonal blocks labelled
       "Placeholder — owner's photo", matching Correction 3
     - the `headlineSample` with the city filled in
     - the archetype's two CTAs, with the label colour from `pickReadable`
     - a trust strip
     - three service cards built from the category's first three `q` terms
     - a footer stub carrying "Demo site — not affiliated with {Business
       Name}."
  3. The direction name, the site type, and the tier ("Standard ·
     Portfolio showcase"), the three moods, `bestFor` and `whyItFits`.
  4. Seven swatches with role and hex. Each is a `CopyChip`.
  5. A type specimen: "Aa" in the display face and a line in the body face,
     with the T-id and font names.
  6. A **Use this direction** button. Mark the selected card with the brand
     ring the app already uses for focus and selection. Don't add a new
     colour for it.
- Selecting a card rebuilds the kit through the overlay, so the build
  prompt updates immediately.
- The picker is accessible: the cards form a radio group with the arrow
  keys, the selection is announced through `role="status"`, and the
  previews are `aria-hidden` apart from a text summary.
- `pnpm a11y` has to pass with a kit built. Run it on the three pilot
  categories, all three directions, light and dark, at 390px and 1280px.
  If a combo fails inside the preview, fix how the preview uses it
  (`pickReadable`, as the template does). **Never** change a combo's hex.

## Step 5 — Persisting the direction

- **URL:** `toQuery` and `fromQuery` gain `dir=a|b|c`, written only when a
  kit was built with it. Old links keep working.
- **Database:** a migration, `supabase/migrations/<timestamp>_kit_direction.sql`,
  adds `kits.direction text not null default 'b' check (direction in
  ('a','b','c'))`. Then run `pnpm stack reset` and `pnpm gen:types`. The
  existing RLS policies cover the column, and `pnpm test:rls` proves it.
- `saveKit` stores the direction. `/kits/[id]` rebuilds the kit with it.
  Saving still stores **inputs** and rebuilds on view, as it does today.

## Step 6 — Download for prospecting

Add a **Download kit (.md)** button next to Save. It generates the file on
the client and creates no server route. Name the file
`fieldkit_<kitSlug>_<citySlug>.md`.

Start the file with YAML front matter containing these keys: `category`,
`slug`, `city`, `state`, `marketLabel`, `device`, `demoPattern`,
`direction`, `contentSource` (`category` or `generic`), `reviewStatus`
and `generatedAt`.

Below the front matter, include these sections, using `kitText`:

- Filtering signals and the ten scorer checks (from `src/data/checks.ts`)
- Fifteen openers, as Angle / Line / Hook / Link line
- Sequence, with the email block in full
- Pricing table
- Upsell ladder

Keep the headings fixed, and add a snapshot test of the headings. Prompt C
parses this file.

## Step 7 — Leads CSV import (`/leads/import`)

This is how Cowork's results reach the tracker without Cowork touching the
database.

- Accept a CSV whose header **starts with the exact 28 columns of
  `CSV_HEADER`**. It may be followed by up to ten scorer columns named
  exactly as `CHECK_LABELS[i].label`, with Yes/No values. Reject any other
  header and say which column is wrong.
- Parse values the way `leadCells` writes them, in reverse. Map Stage and
  Channel by label. Ignore `Score /10` and `Tier`, because the database
  generates them from the check columns.
- Deduplicate against the user's existing leads by email, by phone with
  digits only, or by Google Maps URL. Show duplicates as skipped and never
  overwrite them.
- Cap an import at 200 rows. Show a preview table first (rows to add,
  duplicates, errors per row), then an **Import N leads** confirmation.
- Inserts go through the session client, so RLS applies. The e2e test
  imports a two-row fixture and checks the generated score and tier.

## Step 8 — Tests

Do not modify any of the existing tests. These are new:

- **Overlay:** run the overlay on the three pilot fixtures, and snapshot
  `kitText` under `golden/v2/`. Those snapshots are this layer's own
  goldens, kept separate from the original's.
- **Null kit:** `applyCategoryKit` with a null kit returns `generateKit`'s
  output deep-equal.
- **Placeholders:** after substitution, no `{demo-link}`, `{City}`,
  `{Your Name}` or `{Your Studio}` is left. `{Owner}`,
  `{Business Name}`, `{specific recent job}` and `{Your Phone}` survive.
- **Correction 2:** no opener line and no DM 1 body contains `http`.
- **Scaling:** in Austin (multiplier 1.0) a $1,000 row stays at 1,000. In
  a small market (×0.8) it becomes 800. A $299/mo AI row is 299
  everywhere.
- **Build prompt:** the cases from Step 3.
- **Persistence:** the URL round trip with `dir`, and the
  saved-kit-with-direction rebuild.
- **Import:** the header validation, the label mapping, deduplication and
  the 200-row cap.
- **Brand exemption:** the set-equality test.

## Screenshots

Use `pnpm shots 11 …` to capture into `docs/screenshots/phase-11/`. Shoot
the directions block (1280px side by side and 390px stacked, light and
dark), the build prompt after choosing each direction, the pricing table,
the cross-sell tabs, the ladder, the "Generic kit" chip on a category with
no file, and the import preview.

## Definition of done

```bash
pnpm typecheck && pnpm lint && pnpm build
pnpm test                 # includes kits:check, the original goldens (unchanged) and golden/v2
pnpm parity               # unchanged: exits 0
pnpm golden:sweep         # unchanged: 124 × 2 still match the original
pnpm brand && pnpm a11y
pnpm stack up && pnpm test:rls && pnpm e2e
```

Then check these by hand:

- Build Fencing & gates, Austin. Switch directions A → B → C and watch the
  previews and the build prompt change.
- Build a category that has no kit file. The kit should be identical to
  today's and carry the "Generic kit" chip.
- Save a kit with direction C, sign out and back in, then open it. C
  should still be selected.
- Download a kit, then import the two-row fixture CSV.

## Commit

```
Phase 11: category kits, design directions, kit download and leads import

Adds a reviewed per-category content layer applied over the ported kit
(page-structure additions, three design directions previewed in the
base-website theme combos, a direction-aware build prompt, category
openers and sequence, a min/max pricing table, cross-sell with and
without AI, 20 software & AI products, 12 routes, the upsell ladder),
a kit download for prospecting and a leads CSV import. The port, its
goldens and parity are unchanged.
```

Then say **"Phase 11 complete"** and stop.

## Report back

1. Output of every Definition of done command, pasted as run.
2. Confirm that `golden/`, `CHANGES.md`, `src/data` and `src/content` are
   unchanged, using `git diff --stat` on those paths.
3. The bundle size of one category chunk, and the console page's
   first-load JS before and after.
4. Any combo where `pickReadable` had to step in, with the category and
   the direction.
5. Anything in the schema that was awkward to render. Fix it in Prompt A,
   not with a workaround in a component.

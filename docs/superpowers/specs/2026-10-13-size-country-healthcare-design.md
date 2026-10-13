# Design: business size, healthcare and Canada/UAE

Date: 2026-10-13. Agreed in the 2026-10-12 interview; the owner asked for all four parts to be built in one go, so
the per-part review stops were skipped. Everything new is marked unreviewed.

## What was asked

- A **Small business / Mid-size** split: tabs on the Board, the Kit Console and the lead finder, and a size badge
  wherever a category is named (leads, lead page, saved kits, kit header, reports).
- Mid-size is a mix: mid-size versions of existing categories, new mid-size-only categories, and a different offer
  (systems, portals, integrations) at higher prices.
- **Healthcare** categories on the Board at both sizes, with compliance sold as a service.
- **Countries**: USA (default), Canada, UAE. Country → province or emirate → city. Prices converted at one fixed,
  admin-editable rate, rounded. UAE only: the prospect site's language (English LTR, Arabic RTL, bilingual) goes into
  the build prompt.
- Reach: Board, Kit Console, Leads, Lead finder, Reports, Playbook.
- About forty new categories, scored by Claude, approved by the owner (see `docs/expansion/category-analysis.md`).

## Layers

```
port (src/data, src/content, generateKit)          unchanged; parity + golden:sweep prove it
  └─ catalogue   src/lib/kit/extBoard.ts            new categories, size, display family, country fit
      └─ category kit   src/kits/<slug>.json        43 new files, same schema as the 124
          └─ market layer   src/lib/market/         country, currency, notes, UAE site language
```

- **Catalogue** (`extBoard.ts`, `categories.ts`): `CATS` is still the port's 124, built the same way; `EXT_CATS` adds 43
  rows; `ALL_CATS` is both. Each row has an engine family `f` (one of the port's 13, whose sources, tone and style
  the ported kit uses), a display `group` (the port's families plus `health`), `size`, optional archetype and care-plan
  overrides, and `fit` per country. `findCategory` looks in the port first.
- **Regions** (`market/regions.ts`): `REGIONS = {...STATES, ...CA_REGIONS, ...AE_REGIONS}`, a new object; codes are
  disjoint (US and Canada two letters, emirates three). `KitInput.st` is a `RegionCode`.
- **Market layer** (`market/apply.ts`): `applyMarket(kit, X, { rates, lang })` runs after `applyCategoryKit`. It swaps
  the family chip for the display family, adds size and country chips, adds a mid-size note, Canada/UAE source notes,
  healthcare "check before you build" notes per country, the UAE language block in the build prompt, and converts
  every dollar amount in the kit's text. For a US port category it changes only the chips.
- **Currency** (`market/currency.ts`): one regex over the price forms the kits use (`$1,800–3,000`, `$4k–12k`,
  `$300–3k`, `$99`), friendly rounding. Rates live in `team/workspace.json` (`markets.rates`), edited in Settings.

## Touches to port files (behaviour-preserving)

The guardrail says not to edit `generateKit`. Two lookups had to widen so non-US regions and new categories can be
built; for every port input the result is byte-identical, which `pnpm golden:sweep` (248 kits) and `pnpm parity` confirm.

- `generate.ts` `buildContext`: `STATES[input.st][0]` → `regionName(input.st)`.
- `helpers.ts`: region lookups read `REGIONS`; `archKey` checks `c.arch` after `ARCHOVER`; `priceModel` uses `c.care`
  when a row carries one. Port rows never carry either.
- `categories.ts`: `findCategory` falls back to `EXT_CATS`; each port row gains `size: "small"`, `group`, `fit`.

## Screens

- **Board**: country picker, Small/Mid-size tabs (ARIA tabs with arrow keys), family chips limited to families present,
  size and "Strong in …" badges, "Weak or dated site" column label on the Mid-size tab.
- **Kit Console**: country picker above Step 1; tabs and family chips in Step 1; region label and options follow the
  country; a UAE-only "prospect site's language" choice before the lead finder; the kit rebuilds its prompt when the
  language changes. URL keeps `country`, `size`, `lang`.
- **Saved kits**: `site_lang` on the kit record (optional, schema-validated); the kit page applies the market layer.
- **Lead finder**: same pickers; server routes accept any region; the Maps query names the emirate and country outside the US.
- **Leads**: region codes up to three letters; country and size filters; Mid-size badge and country in the list; size
  and country chips on the lead page; duplicate phone keys understand +971/0 forms.
- **Reports**: tables by business size and by country.
- **Playbook**: sections 12 Mid-size companies, 13 Healthcare practices, 14 Canada and the UAE (`lib/playbookExt.ts`,
  outside `src/content` so parity never sees them).
- **Settings**: exchange rates for CAD and AED.

## Testing

`tests/market.test.ts` (catalogue integrity, regions, currency, market layer, URL round trip, saved-kit validation,
Maps query, phone keys), updated `tests/board.test.ts`, `pnpm kits:check` over all 167 kit files with mid-size money
caps (one-time 150k, monthly 8k), plus the existing parity, golden sweep, brand, a11y and e2e runs.

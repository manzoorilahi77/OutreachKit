"use client";

import { useMemo, useState } from "react";
import { FAM } from "@/data";
import type { FamKey } from "@/data";
import { CountryPicker, FitBadge, GroupFilters, SizeBadge, SizeTabs } from "@/components/catalog/CatalogControls";
import { BOARD_CONTENT } from "@/content/board";
import { Chip } from "@/components/ui/Chip";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { DEFAULT_SORT, boardRows, nextSort, type Sort, type SortKey } from "@/lib/board";
import { catalogFor, groupLabel } from "@/lib/kit/categories";
import type { GroupKey, Size } from "@/lib/kit/extBoard";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/lib/market/regions";
import { chipVariant } from "./InlineView";

export const FAM_KEYS = Object.keys(FAM) as FamKey[];
const FACTORS = ["TKT", "GAP", "ROI", "DEN", "ACC", "REC", "CLR"];

export function FactorBars({ d }: { d: number[] }) {
  return (
    <span className="inline-flex items-end gap-0.5 align-middle" aria-hidden>
      {d.map((v, i) => (
        <i key={i} className={`block w-1 rounded-sm ${v >= 4 ? "bg-head" : "bg-fg/30"}`} style={{ height: v * 3 + 3 }} />
      ))}
    </span>
  );
}

export function FamilyFilters({ value, onChange, allLabel }: { value: "all" | FamKey; onChange: (v: "all" | FamKey) => void; allLabel: string }) {
  return (
    <div role="group" aria-label="Family" className="flex flex-wrap gap-2">
      <ToggleChip pressed={value === "all"} onClick={() => onChange("all")}>{allLabel}</ToggleChip>
      {FAM_KEYS.map((k) => (
        <ToggleChip key={k} pressed={value === k} onClick={() => onChange(k)}>{FAM[k].l}</ToggleChip>
      ))}
    </div>
  );
}

export function Board() {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [size, setSize] = useState<Size>("small");
  const [fam, setFam] = useState<"all" | GroupKey>("all");
  const [tier, setTier] = useState<"all" | "A" | "B" | "C">("all");
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const scope = { size, country };
  const rows = useMemo(() => boardRows(fam, tier, sort, { size, country }), [fam, tier, sort, size, country]);
  const inScope = useMemo(() => catalogFor(size, country), [size, country]);
  const counts = useMemo(() => ({ small: catalogFor("small", country).length, mid: catalogFor("mid", country).length }), [country]);
  const label = (l: string) => (size === "mid" && l === "No real site" ? "Weak or dated site" : l);

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <CountryPicker id="board-country" value={country} onChange={(c) => { setCountry(c); setFam("all"); }} hint="Hides trades that don't exist there and marks the strong ones." />
      </div>
      <SizeTabs idBase="board-size" value={size} onChange={(v) => { setSize(v); setFam("all"); }} counts={counts} />
      <div id="board-size-panel" role="tabpanel" aria-labelledby={`board-size-tab-${size}`} className="space-y-4">
        <GroupFilters value={fam} onChange={setFam} allLabel="All families" cats={inScope} />
        <div role="group" aria-label="Tier" className="flex flex-wrap gap-2">
          <ToggleChip pressed={tier === "all"} onClick={() => setTier("all")}>All tiers</ToggleChip>
          {(["A", "B", "C"] as const).map((t) => (
            <ToggleChip key={t} pressed={tier === t} onClick={() => setTier(t)}>Tier {t}</ToggleChip>
          ))}
        </div>

        <TableWrap label="Category board">
          <thead>
            <tr>
              {BOARD_CONTENT.columns.map((c) => {
                const sk = c.sort as SortKey | undefined;
                const active = sk && sort.k === sk;
                return (
                  <th key={c.label} scope="col" className={th} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                    {sk ? (
                      <button type="button" onClick={() => setSort(nextSort(sort, sk))} className="inline-flex min-h-11 items-center gap-1 font-medium text-head">
                        {label(c.label)}
                        <span aria-hidden className="w-3 text-sm">{active ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
                      </button>
                    ) : (
                      label(c.label)
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.i}>
                <td className={`${td} font-medium text-head`}>
                  <span className="block">{c.n}</span>
                  <span className="mt-1 flex flex-wrap gap-1"><SizeBadge size={c.size} />{scope.country !== "US" && <FitBadge c={c} country={scope.country} />}</span>
                </td>
                <td className={td}>{groupLabel(c.group)}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{c.tkt}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{c.price}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{c.gap}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  <FactorBars d={c.d} />{" "}
                  <strong>{c.idx}</strong>
                  <span className="sr-only"> out of 100. Factors: {c.d.map((v, i) => `${FACTORS[i]} ${v}`).join(", ")}</span>
                </td>
                <td className={td}><Chip variant={chipVariant(c.tier.toLowerCase())}>{c.tier}</Chip></td>
                <td className={`${td} min-w-72 text-sm text-muted`}>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <p className="max-w-3xl text-sm text-muted" aria-live="polite">
          {rows.length} of {inScope.length} {size === "mid" ? "mid-size" : "small-business"} categories shown{country !== "US" ? " for " + COUNTRIES[country].short : ""}. Score is the weighted seven-factor index out of 100; bars are the raw factors in order TKT, GAP, ROI, DEN, ACC, REC, CLR.
          {size === "mid" ? " For mid-size companies GAP is the share with a weak or dated site, and prices are in US dollars." : country !== "US" ? " Prices are in US dollars; kits convert them." : ""}
        </p>
      </div>
    </div>
  );
}

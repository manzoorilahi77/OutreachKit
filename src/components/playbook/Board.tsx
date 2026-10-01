"use client";

import { useMemo, useState } from "react";
import { FAM } from "@/data";
import type { FamKey } from "@/data";
import { BOARD_CONTENT } from "@/content/board";
import { Chip } from "@/components/ui/Chip";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { DEFAULT_SORT, boardRows, nextSort, type Sort, type SortKey } from "@/lib/board";
import { CATS } from "@/lib/kit/categories";
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
  const [fam, setFam] = useState<"all" | FamKey>("all");
  const [tier, setTier] = useState<"all" | "A" | "B" | "C">("all");
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const rows = useMemo(() => boardRows(fam, tier, sort), [fam, tier, sort]);

  return (
    <div className="space-y-4">
      <FamilyFilters value={fam} onChange={setFam} allLabel="All families" />
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
                      {c.label}
                      <span aria-hidden className="w-3 text-sm">{active ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.i}>
              <td className={`${td} font-medium text-head`}>{c.n}</td>
              <td className={td}>{FAM[c.f].l}</td>
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
        {rows.length} of {CATS.length} categories shown. Score is the weighted seven-factor index out of 100; bars are the raw factors in order TKT, GAP, ROI, DEN, ACC, REC, CLR.
      </p>
    </div>
  );
}

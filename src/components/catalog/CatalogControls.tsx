"use client";

// The catalogue's shared controls: country, business size (tabs), family filters and the size and fit badges.
// Used by the Board, the Kit Console, the lead finder and the leads list.
import { useRef } from "react";
import { Chip } from "@/components/ui/Chip";
import { Field, Select } from "@/components/ui/Field";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { GROUP_KEYS, groupLabel } from "@/lib/kit/categories";
import { SIZE_LABEL, SIZE_SHORT, type GroupKey, type Size } from "@/lib/kit/extBoard";
import type { Category } from "@/lib/kit/types";
import { COUNTRIES, COUNTRY_CODES, type Country } from "@/lib/market/regions";

export function CountryPicker({ id, value, onChange, hint }: { id: string; value: Country; onChange: (c: Country) => void; hint?: string }) {
  return (
    <Field id={id} label="Country" hint={hint}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as Country)}>
        {COUNTRY_CODES.map((c) => <option key={c} value={c}>{COUNTRIES[c].name}</option>)}
      </Select>
    </Field>
  );
}

const SIZES: Size[] = ["small", "mid"];

/** Small business | Mid-size, as tabs. The panel they control is the caller's; give it id `${idBase}-panel`. */
export function SizeTabs({ idBase, value, onChange, counts }: { idBase: string; value: Size; onChange: (s: Size) => void; counts?: Record<Size, number> }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function key(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? SIZES.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + SIZES.length) % SIZES.length;
    onChange(SIZES[n]!);
    refs.current[n]?.focus();
  }
  return (
    <div role="tablist" aria-label="Business size" className="flex flex-wrap gap-1 border-b border-line">
      {SIZES.map((s, i) => (
        <button
          key={s}
          ref={(el) => { refs.current[i] = el; }}
          id={`${idBase}-tab-${s}`}
          type="button"
          role="tab"
          aria-selected={value === s}
          aria-controls={`${idBase}-panel`}
          tabIndex={value === s ? 0 : -1}
          onClick={() => onChange(s)}
          onKeyDown={(e) => key(e, i)}
          className="-mb-px min-h-11 border-b-2 border-transparent px-4 text-base font-medium text-muted hover:text-head aria-selected:border-head aria-selected:text-head"
        >
          {SIZE_LABEL[s]}{counts ? <span className="ml-2 tabular-nums">{counts[s]}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Family filter chips for the families that have categories in `cats`. */
export function GroupFilters({ value, onChange, allLabel, cats }: { value: "all" | GroupKey; onChange: (v: "all" | GroupKey) => void; allLabel: string; cats: Category[] }) {
  const present = new Set(cats.map((c) => c.group));
  return (
    <div role="group" aria-label="Family" className="flex flex-wrap gap-2">
      <ToggleChip pressed={value === "all"} onClick={() => onChange("all")}>{allLabel}</ToggleChip>
      {GROUP_KEYS.filter((k) => present.has(k)).map((k) => (
        <ToggleChip key={k} pressed={value === k} onClick={() => onChange(k)}>{groupLabel(k)}</ToggleChip>
      ))}
    </div>
  );
}

export function SizeBadge({ size }: { size: Size }) {
  return <Chip variant={size === "mid" ? "warm" : "plain"}>{SIZE_SHORT[size]}</Chip>;
}

/** "Strong in the UAE" when the category is a strong market in the chosen country. Nothing otherwise. */
export function FitBadge({ c, country }: { c: Category; country: Country }) {
  if (c.fit[country] !== "strong") return null;
  return <Chip variant="tier-b">Strong in {country === "US" ? "the US" : country === "AE" ? "the UAE" : "Canada"}</Chip>;
}

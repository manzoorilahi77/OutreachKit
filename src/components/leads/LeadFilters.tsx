"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { STAGE_GROUPS, stageLabel, type Stage } from "@/lib/leads/stages";

export interface HolderOption { value: string; label: string; count: number }

interface Props {
  stage: Stage | undefined;
  tier: string | undefined;
  by: string | undefined;
  tiers: { v: string; l: string }[];
  /** Lead counts for each stage and tier, so a dropdown can say how many it would show. */
  stageCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  /** Null hides the Held by dropdown (a person's own leads are all theirs). */
  holders: HolderOption[] | null;
  holderLabel: string;
  /** Market filters: country (from the lead's region code) and business size (from its category). */
  country?: string;
  size?: string;
  countryOptions?: { v: string; l: string; count: number }[];
  sizeOptions?: { v: string; l: string; count: number }[];
}

const labelClass = "mb-1 block text-sm uppercase tracking-wide text-muted";

/**
 * The leads filters as dropdowns: Prospecting (its stages and the tier), Outreach, Closing, and Held by. Prospecting, Outreach and
 * Closing share one choice, so picking in one clears the others. Held by is separate and combines with them. The URL holds the state.
 */
export function LeadFilters({ stage, tier, by, tiers, stageCounts, tierCounts, holders, holderLabel, country, size, countryOptions, sizeOptions }: Props) {
  const router = useRouter();

  // Country and size combine with everything; they are carried unless the change names them.
  function go(next: { stage?: string; tier?: string; by?: string; country?: string; size?: string }, market = { country, size }) {
    const p = new URLSearchParams();
    if (next.stage) p.set("stage", next.stage);
    if (next.tier) p.set("tier", next.tier);
    if (next.by) p.set("by", next.by);
    const m = { ...market, ...("country" in next ? { country: next.country } : {}), ...("size" in next ? { size: next.size } : {}) };
    if (m.country) p.set("country", m.country);
    if (m.size) p.set("size", m.size);
    router.push("/leads" + (p.size ? "?" + p : ""));
  }

  const owner = (key: string) => (key === "prospecting" ? !!tier || (!!stage && STAGE_GROUPS[0]!.stages.includes(stage)) : !!stage && !tier && STAGE_GROUPS.find((g) => g.key === key)!.stages.includes(stage));
  const valueFor = (key: string) => (!owner(key) ? "" : key === "prospecting" && tier ? `tier:${tier}` : `stage:${stage}`);

  function pick(key: string, v: string) {
    if (v === "") {
      if (owner(key)) go({ by });
      return;
    }
    const [kind, val] = v.split(":");
    go(kind === "tier" ? { tier: val, by } : { stage: val, by });
  }

  const active = !!(stage || tier || by || country || size);

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
      {STAGE_GROUPS.map((g) => (
        <div key={g.key} className="w-full sm:w-56">
          <label htmlFor={`f-${g.key}`} className={labelClass}>{g.label}</label>
          <Select id={`f-${g.key}`} value={valueFor(g.key)} onChange={(e) => pick(g.key, e.target.value)}>
            <option value="">Any</option>
            <optgroup label={g.key === "prospecting" ? "Stage" : g.label}>
              {g.stages.map((x) => <option key={x} value={`stage:${x}`}>{stageLabel(x)} ({stageCounts[x] ?? 0})</option>)}
            </optgroup>
            {g.key === "prospecting" && (
              <optgroup label="Tier">
                {tiers.map((t) => <option key={t.v} value={`tier:${t.v}`}>{t.l} ({tierCounts[t.v] ?? 0})</option>)}
              </optgroup>
            )}
          </Select>
        </div>
      ))}
      {holders && (
        <div className="w-full sm:w-56">
          <label htmlFor="f-by" className={labelClass}>{holderLabel}</label>
          <Select id="f-by" value={by ?? ""} onChange={(e) => go({ stage, tier, by: e.target.value || undefined })}>
            <option value="">Anyone</option>
            {holders.map((h) => <option key={h.value} value={h.value}>{h.label} ({h.count})</option>)}
          </Select>
        </div>
      )}
      {countryOptions && countryOptions.length > 1 && (
        <div className="w-full sm:w-56">
          <label htmlFor="f-country" className={labelClass}>Country</label>
          <Select id="f-country" value={country ?? ""} onChange={(e) => go({ stage, tier, by, country: e.target.value || undefined })}>
            <option value="">Any</option>
            {countryOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
          </Select>
        </div>
      )}
      {sizeOptions && (
        <div className="w-full sm:w-56">
          <label htmlFor="f-size" className={labelClass}>Business size</label>
          <Select id="f-size" value={size ?? ""} onChange={(e) => go({ stage, tier, by, size: e.target.value || undefined })}>
            <option value="">Any</option>
            {sizeOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
          </Select>
        </div>
      )}
      {active && <button type="button" onClick={() => router.push("/leads")} className="inline-flex min-h-11 items-center px-1 font-medium text-head underline underline-offset-4">Clear filters</button>}
    </div>
  );
}

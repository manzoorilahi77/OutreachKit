"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { STAGE_GROUPS, stageLabel, type Stage } from "@/lib/leads/stages";

export interface HolderOption { value: string; label: string; count: number }
export interface FilterOption { v: string; l: string; count: number }

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
  countryOptions?: FilterOption[];
  sizeOptions?: FilterOption[];
  /** Whether the lead has a website: "with", "without" or "unknown" (nobody has checked). */
  website?: string;
  websiteOptions?: FilterOption[];
  /** Place and business filters. The options already carry counts that respect the other filters. */
  state?: string;
  city?: string;
  category?: string;
  stateOptions?: FilterOption[];
  cityOptions?: FilterOption[];
  /** False until a state is chosen (or only one exists): a city name alone can belong to several states. */
  cityEnabled?: boolean;
  categoryOptions?: FilterOption[];
  /** How many leads the filters leave, out of all the leads this person can see. */
  shown: number;
  total: number;
}

type Query = { stage?: string; tier?: string; by?: string; country?: string; size?: string; website?: string; state?: string; city?: string; category?: string };
const KEYS = ["stage", "tier", "by", "country", "size", "website", "state", "city", "category"] as const;

const labelClass = "mb-1 block text-sm text-muted";
const fieldsetClass = "grid gap-x-4 gap-y-3 sm:grid-cols-2";

/**
 * The leads filters as one panel: pipeline dropdowns (Prospecting, Outreach, Closing, Held by), then where and what (Country, State,
 * City, Category, Business size), with the active choices underneath as chips that remove themselves. Prospecting, Outreach and
 * Closing share one choice, so picking in one clears the others; everything else combines. The URL holds the state.
 */
export function LeadFilters({
  stage, tier, by, tiers, stageCounts, tierCounts, holders, holderLabel, country, size, countryOptions, sizeOptions, website, websiteOptions,
  state, city, category, stateOptions, cityOptions, cityEnabled, categoryOptions, shown, total,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current: Query = { stage, tier, by, country, size, website, state, city, category };

  // Every change starts from what the page shows now; a key in the patch replaces it, and undefined removes it.
  function go(patch: Query) {
    const next: Query = { ...current, ...patch };
    const p = new URLSearchParams();
    for (const k of KEYS) if (next[k]) p.set(k, next[k]!);
    router.push("/leads" + (p.size ? "?" + p : ""));
  }

  const owner = (key: string) => (key === "prospecting" ? !!tier || (!!stage && STAGE_GROUPS[0]!.stages.includes(stage)) : !!stage && !tier && STAGE_GROUPS.find((g) => g.key === key)!.stages.includes(stage));
  const valueFor = (key: string) => (!owner(key) ? "" : key === "prospecting" && tier ? `tier:${tier}` : `stage:${stage}`);

  function pick(key: string, v: string) {
    if (v === "") {
      if (owner(key)) go({ stage: undefined, tier: undefined });
      return;
    }
    const [kind, val] = v.split(":");
    go(kind === "tier" ? { tier: val, stage: undefined } : { stage: val, tier: undefined });
  }

  const showCountry = !!countryOptions && (countryOptions.length > 1 || !!country);
  const lookup = (opts: FilterOption[] | undefined, v: string) => opts?.find((o) => o.v === v)?.l ?? v;

  const chips: { text: string; patch: Query }[] = [];
  if (stage) chips.push({ text: `${STAGE_GROUPS.find((g) => g.stages.includes(stage))?.label ?? "Stage"}: ${stageLabel(stage)}`, patch: { stage: undefined } });
  if (tier) chips.push({ text: `Tier: ${tiers.find((t) => t.v === tier)?.l ?? tier}`, patch: { tier: undefined } });
  if (by) chips.push({ text: `${holderLabel}: ${holders?.find((h) => h.value === by)?.label ?? by}`, patch: { by: undefined } });
  if (country) chips.push({ text: `Country: ${lookup(countryOptions, country)}`, patch: { country: undefined } });
  if (state) chips.push({ text: `State: ${lookup(stateOptions, state)}`, patch: { state: undefined, city: undefined } });
  if (city) chips.push({ text: `City: ${city}`, patch: { city: undefined } });
  if (category) chips.push({ text: `Category: ${category}`, patch: { category: undefined } });
  if (website) chips.push({ text: `Website: ${lookup(websiteOptions, website)}`, patch: { website: undefined } });
  if (size) chips.push({ text: `Size: ${lookup(sizeOptions, size)}`, patch: { size: undefined } });

  return (
    <section aria-label="Filter leads" className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <h2 className="text-lg font-medium">
          <button type="button" aria-expanded={open} aria-controls="lead-filter-fields" onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-2 sm:hidden">
            Filters{chips.length > 0 && ` (${chips.length})`}
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={open ? "rotate-180" : ""}><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
          <span className="hidden sm:inline">Filters</span>
        </h2>
        <p role="status" className="text-sm text-muted">{shown === total ? `${total} ${total === 1 ? "lead" : "leads"}` : `${shown} of ${total} leads`}</p>
      </div>

      <div id="lead-filter-fields" className={`${open ? "block" : "hidden sm:block"} space-y-4 border-t border-line p-4`}>
        <fieldset className={`${fieldsetClass} lg:grid-cols-4`}>
          <legend className="mb-2 text-sm font-medium">Pipeline</legend>
          {STAGE_GROUPS.map((g) => (
            <div key={g.key}>
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
            <div>
              <label htmlFor="f-by" className={labelClass}>{holderLabel}</label>
              <Select id="f-by" value={by ?? ""} onChange={(e) => go({ by: e.target.value || undefined })}>
                <option value="">Anyone</option>
                {holders.map((h) => <option key={h.value} value={h.value}>{h.label} ({h.count})</option>)}
              </Select>
            </div>
          )}
        </fieldset>

        <fieldset className={`${fieldsetClass} lg:grid-cols-3`}>
          <legend className="mb-2 text-sm font-medium">Where and what</legend>
          {showCountry && (
            <div>
              <label htmlFor="f-country" className={labelClass}>Country</label>
              <Select id="f-country" value={country ?? ""} onChange={(e) => go({ country: e.target.value || undefined })}>
                <option value="">Any</option>
                {countryOptions!.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
              </Select>
            </div>
          )}
          {stateOptions && (
            <div>
              <label htmlFor="f-state" className={labelClass}>State</label>
              <Select id="f-state" value={state ?? ""} onChange={(e) => go({ state: e.target.value || undefined, city: undefined })}>
                <option value="">Any</option>
                {stateOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
              </Select>
            </div>
          )}
          {cityOptions && (
            <div>
              <label htmlFor="f-city" className={labelClass}>City</label>
              <Select id="f-city" value={city ?? ""} disabled={!cityEnabled} className="disabled:cursor-not-allowed disabled:opacity-60" onChange={(e) => go({ city: e.target.value || undefined })}>
                <option value="">{cityEnabled ? "Any" : "Pick a state first"}</option>
                {cityOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
              </Select>
            </div>
          )}
          {categoryOptions && (
            <div>
              <label htmlFor="f-category" className={labelClass}>Business category</label>
              <Select id="f-category" value={category ?? ""} onChange={(e) => go({ category: e.target.value || undefined })}>
                <option value="">Any</option>
                {categoryOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
              </Select>
            </div>
          )}
          {websiteOptions && (
            <div>
              <label htmlFor="f-website" className={labelClass}>Website</label>
              <Select id="f-website" value={website ?? ""} onChange={(e) => go({ website: e.target.value || undefined })}>
                <option value="">Any</option>
                {websiteOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
              </Select>
            </div>
          )}
          {sizeOptions && (
            <div>
              <label htmlFor="f-size" className={labelClass}>Business size</label>
              <Select id="f-size" value={size ?? ""} onChange={(e) => go({ size: e.target.value || undefined })}>
                <option value="">Any</option>
                {sizeOptions.map((o) => <option key={o.v} value={o.v}>{o.l} ({o.count})</option>)}
              </Select>
            </div>
          )}
        </fieldset>
      </div>

      {chips.length > 0 && (
        <ul aria-label="Active filters" className="m-0 flex list-none flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          {chips.map((c) => (
            <li key={c.text}>
              <button type="button" aria-label={`Remove filter ${c.text}`} onClick={() => go(c.patch)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-head bg-bg px-3 text-sm text-head hover:bg-head/10">
                {c.text}
                <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => router.push("/leads")} className="inline-flex min-h-9 items-center px-1 font-medium text-head underline underline-offset-4">Clear filters</button>
          </li>
        </ul>
      )}
    </section>
  );
}

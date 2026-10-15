"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field, Select } from "@/components/ui/Field";
import { SIGNAL_TYPES } from "@/lib/it/model";
import { searchStrings } from "@/lib/it/searchStrings";
import { COUNTRIES, COUNTRY_CODES, type Country } from "@/lib/market/regions";

/** Copy-only searches per signal type. They open in the person's own browser; the app never runs them. */
export function SearchStrings() {
  const [country, setCountry] = useState<Country>("US");
  return (
    <div className="space-y-8">
      <div className="max-w-xs">
        <Field id="ss-country" label="Country">
          <Select id="ss-country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
            {COUNTRY_CODES.map((c) => <option key={c} value={c}>{COUNTRIES[c].name}</option>)}
          </Select>
        </Field>
      </div>
      {SIGNAL_TYPES.map((t) => (
        <section key={t.value} aria-labelledby={`ss-${t.value}`} className="space-y-3">
          <h2 id={`ss-${t.value}`} className="text-2xl">{t.label}</h2>
          <p className="max-w-3xl text-muted">{t.what}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {searchStrings(t.value, country).map((x) => (
              <li key={x.where + x.query} className="space-y-2 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{x.where}</span>
                  <a href={x.url} target="_blank" rel="noopener noreferrer">Open the search<span className="sr-only"> on {x.where} (opens in a new tab)</span></a>
                </div>
                <code className="block break-words rounded-md border border-line bg-bg p-2">{x.query}</code>
                <div className="flex flex-wrap items-center gap-3">
                  <CopyButton text={x.query} label="Copy the search" />
                  {x.note && <span className="text-sm text-muted">{x.note}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { CONSOLE_STRINGS as S } from "@/content/consoleStrings";
import { CountryPicker, FitBadge, GroupFilters, SizeBadge, SizeTabs } from "@/components/catalog/CatalogControls";
import { Field, Input, Select } from "@/components/ui/Field";
import { LeadFinder } from "@/components/scrape/LeadFinder";
import { catalogFor, findCategory } from "@/lib/kit/categories";
import type { GroupKey, Size } from "@/lib/kit/extBoard";
import { stateOptions } from "@/lib/console";
import { COUNTRIES, DEFAULT_COUNTRY, regionCities, type Country, type RegionCode } from "@/lib/market/regions";

/** The lead finder on its own page. Picks work as in the Kit Console: country, size and family, then category, then region and city. */
export function FinderPage({ canMove }: { canMove: boolean }) {
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [size, setSize] = useState<Size>("small");
  const [cat, setCat] = useState("");
  const [famF, setFamF] = useState<"all" | GroupKey>("all");
  const [st, setSt] = useState<RegionCode | "">("");
  const [listCity, setListCity] = useState("");
  const [freeCity, setFreeCity] = useState("");
  const states = useMemo(() => stateOptions(country), [country]);
  const cities = st ? regionCities(st) : [];
  const inScope = useMemo(() => catalogFor(size, country), [size, country]);
  const list = useMemo(() => inScope.filter((c) => famF === "all" || c.group === famF).slice().sort((a, b) => b.idx - a.idx), [inScope, famF]);
  const counts = useMemo(() => ({ small: catalogFor("small", country).length, mid: catalogFor("mid", country).length }), [country]);
  const region = COUNTRIES[country].region;

  function pickCountry(c: Country) {
    setCountry(c);
    setSt(""); setListCity(""); setFreeCity(""); setFamF("all");
    if (cat && findCategory(cat)?.fit[c] === "no") setCat("");
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xs"><CountryPicker id="fp-country" value={country} onChange={pickCountry} /></div>
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-sm text-muted">Step 1</span>
          <h2 className="text-2xl">Pick your category</h2>
          <p className="text-sm text-muted">{S.catHint(list.length)}</p>
        </div>
        <SizeTabs idBase="fp-size" value={size} counts={counts} onChange={(v) => { setSize(v); setFamF("all"); }} />
        <GroupFilters value={famF} onChange={setFamF} allLabel={S.allFamilies} cats={inScope} />
        <div id="fp-size-panel" role="tabpanel" aria-labelledby={`fp-size-tab-${size}`} className="grid max-h-[26rem] gap-2 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <button
              key={c.i}
              type="button"
              aria-pressed={cat === c.n}
              onClick={() => setCat(c.n)}
              className="group min-h-11 rounded-md border border-line p-3 text-left hover:border-head aria-pressed:border-head aria-pressed:bg-fill aria-pressed:text-on-fill"
            >
              <span className="block font-medium">{c.n}</span>
              <span className="block text-sm">Tier {c.tier} · {c.idx} · {c.price}</span>
              <span className="mt-1 flex flex-wrap gap-1"><SizeBadge size={c.size} /><FitBadge c={c} country={country} /></span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-sm text-muted">Step 2</span>
          <h2 className="text-2xl">Choose the {region.toLowerCase()} and city</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="fp-st" label={region}>
            <Select id="fp-st" value={st} onChange={(e) => { setSt(e.target.value as RegionCode | ""); setListCity(""); setFreeCity(""); }}><option value="">Choose a {region.toLowerCase()}</option>{states.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}</Select>
          </Field>
          <Field id="fp-city" label="City from the list">
            <Select id="fp-city" value={listCity} disabled={!st} onChange={(e) => { setListCity(e.target.value); if (e.target.value) setFreeCity(""); }}><option value="">{st ? "Choose a city" : `Choose a ${region.toLowerCase()} first`}</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
          <Field id="fp-free" label="Or type a city">
            <Input id="fp-free" value={freeCity} autoComplete="off" onChange={(e) => { setFreeCity(e.target.value); if (e.target.value.trim()) setListCity(""); }} />
          </Field>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-head">
        <LeadFinder cat={cat || null} st={st} city={freeCity.trim() || listCity} canMove={canMove} />
        {(!cat || !st || !(freeCity.trim() || listCity)) && <p className="p-4 text-muted sm:p-6">Choose a category, a {region.toLowerCase()} and a city to begin.</p>}
      </div>
    </div>
  );
}

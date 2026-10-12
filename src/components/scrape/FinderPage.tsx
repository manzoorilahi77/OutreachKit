"use client";

import { useMemo, useState } from "react";
import { STATES } from "@/data";
import type { FamKey, StateCode } from "@/data";
import { CONSOLE_STRINGS as S } from "@/content/consoleStrings";
import { FamilyFilters } from "@/components/playbook/Board";
import { Field, Input, Select } from "@/components/ui/Field";
import { LeadFinder } from "@/components/scrape/LeadFinder";
import { CATS } from "@/lib/kit/categories";
import { stateOptions } from "@/lib/console";

/** The lead finder on its own page. Picks work as in the Kit Console: family, then category, then state and city. */
export function FinderPage({ canMove }: { canMove: boolean }) {
  const [cat, setCat] = useState("");
  const [famF, setFamF] = useState<"all" | FamKey>("all");
  const [st, setSt] = useState<StateCode | "">("");
  const [listCity, setListCity] = useState("");
  const [freeCity, setFreeCity] = useState("");
  const states = useMemo(stateOptions, []);
  const cities = st ? STATES[st][1].split("|") : [];
  const list = useMemo(() => CATS.filter((c) => famF === "all" || c.f === famF).slice().sort((a, b) => b.idx - a.idx), [famF]);
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-sm text-muted">Step 1</span>
          <h2 className="text-2xl">Pick your category</h2>
          <p className="text-sm text-muted">{S.catHint(list.length)}</p>
        </div>
        <FamilyFilters value={famF} onChange={setFamF} allLabel={S.allFamilies} />
        <div role="group" aria-label="Business category" className="grid max-h-[26rem] gap-2 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <button
              key={c.i}
              type="button"
              aria-pressed={cat === c.n}
              onClick={() => setCat(c.n)}
              className="min-h-11 rounded-md border border-line p-3 text-left hover:border-head aria-pressed:border-head aria-pressed:bg-fill aria-pressed:text-on-fill"
            >
              <span className="block font-medium">{c.n}</span>
              <span className="block text-sm">Tier {c.tier} · {c.idx} · {c.price}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="text-sm text-muted">Step 2</span>
          <h2 className="text-2xl">Choose the state and city</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="fp-st" label="State">
            <Select id="fp-st" value={st} onChange={(e) => { setSt(e.target.value as StateCode | ""); setListCity(""); setFreeCity(""); }}><option value="">Choose a state</option>{states.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}</Select>
          </Field>
          <Field id="fp-city" label="City from the list">
            <Select id="fp-city" value={listCity} disabled={!st} onChange={(e) => { setListCity(e.target.value); if (e.target.value) setFreeCity(""); }}><option value="">{st ? "Choose a city" : "Choose a state first"}</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
          </Field>
          <Field id="fp-free" label="Or type a city">
            <Input id="fp-free" value={freeCity} autoComplete="off" onChange={(e) => { setFreeCity(e.target.value); if (e.target.value.trim()) setListCity(""); }} />
          </Field>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-head">
        <LeadFinder cat={cat || null} st={st} city={freeCity.trim() || listCity} canMove={canMove} />
        {(!cat || !st || !(freeCity.trim() || listCity)) && <p className="p-4 text-muted sm:p-6">Choose a category, a state and a city to begin.</p>}
      </div>
    </div>
  );
}

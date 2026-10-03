"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STATES } from "@/data";
import type { FamKey, StateCode } from "@/data";
import { CONSOLE_CONTENT } from "@/content/console";
import { CONSOLE_STRINGS as S } from "@/content/consoleStrings";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Note } from "@/components/ui/Note";
import { InlineView } from "@/components/playbook/InlineView";
import { FamilyFilters } from "@/components/playbook/Board";
import { KitView } from "@/components/kit/KitView";
import {
  EMPTY_CONSOLE, barLine, fromQuery, isReady, statusLine, stateOptions, toKitInput, toQuery, type ConsoleState,
} from "@/lib/console";
import { CATS } from "@/lib/kit/categories";
import { buildContext, generateKit } from "@/lib/kit/generate";
import type { Device, Kit, KitContext, KitInput } from "@/lib/kit/types";
import { SaveKit, type SaveMode } from "@/components/kit/SaveKit";
import { DownloadKit } from "@/components/kit/DownloadKit";
import { applyCategoryKit } from "@/lib/kit-v2/apply";
import { loadCategoryKit } from "@/lib/kit-v2/load";
import type { CategoryKit } from "@/lib/kit-v2/types";

export interface ConsoleDetails { you: string; brand: string; domain: string }

export function Console({
  initialDetails,
  initialDevice = "desktop",
  saveMode = "off",
}: {
  /** Step 4 values from the signed-in profile. Blank gives bracketed placeholders, as in the original. */
  initialDetails?: Partial<ConsoleDetails>;
  initialDevice?: Device;
  saveMode?: SaveMode;
}) {
  const start: ConsoleState = { ...EMPTY_CONSOLE, device: initialDevice };
  const [s, setS] = useState<ConsoleState>(start);
  const [details, setDetails] = useState<ConsoleDetails>({ you: "", brand: "", domain: "", ...initialDetails });
  const [famF, setFamF] = useState<"all" | FamKey>("all");
  const [awaiting, setAwaiting] = useState(false);
  const [built, setBuilt] = useState<{ kit: Kit; input: KitInput; X: KitContext; ck: CategoryKit | null } | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const kitRef = useRef<HTMLDivElement>(null);
  const states = useMemo(stateOptions, []);

  // Read the choices from the URL once, so a link (or a magic-link return) restores the console.
  useEffect(() => {
    const q = window.location.search;
    if (!q) return;
    const restored = fromQuery(q, initialDevice);
    setS(restored);
    if (new URLSearchParams(q).get("build") === "1") build(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = toQuery(s);
    const url = window.location.pathname + (q ? "?" + q : "") + window.location.hash;
    window.history.replaceState(null, "", url);
  }, [s]);

  function update(next: Partial<ConsoleState>) {
    setAwaiting(false);
    setRunStatus(null);
    // Changing an input invalidates the built kit's direction until the next build.
    setS((cur) => {
      const { dir: _dir, ...rest } = cur;
      void _dir;
      return { ...rest, ...next };
    });
  }

  async function build(state: ConsoleState = s) {
    const input = toKitInput(state, { you: details.you, brand: details.brand, domain: details.domain });
    if (!input) return;
    // The category layer loads as its own chunk; without a file the kit is the ported one, marked "Generic kit".
    const ck = await loadCategoryKit(input.cat);
    setBuilt({ kit: generateKit(input), input, X: buildContext(input), ck });
    setS((cur) => {
      const { dir, ...rest } = cur;
      return ck ? { ...rest, dir: dir ?? state.dir ?? "b" } : rest;
    });
    setRunStatus(S.built(input.cat, input.city, input.st));
    requestAnimationFrame(() => kitRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const dir = s.dir ?? "b";
  const shown = useMemo(() => (built ? applyCategoryKit(built.kit, built.X, built.ck, dir) : null), [built, dir]);

  function reset() {
    setS(start);
    setFamF("all");
    setBuilt(null);
    setRunStatus(null);
    setAwaiting(true);
  }

  const cities = s.st ? STATES[s.st][1].split("|") : [];
  const list = CATS.filter((c) => famF === "all" || c.f === famF).slice().sort((a, b) => b.idx - a.idx);
  const ready = isReady(s);

  return (
    <div className="overflow-hidden rounded-lg border border-head">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-4 py-3 text-warm">
        <strong className="text-lg text-warm">{CONSOLE_CONTENT.bar}</strong>
        <span className="text-sm text-warm/90" aria-live="polite">{awaiting ? CONSOLE_CONTENT.barState : barLine(s)}</span>
      </div>

      <div className="divide-y divide-line">
        {CONSOLE_CONTENT.steps.map((step, si) => (
          <div key={step.k} className="space-y-4 p-4 sm:p-6">
            <div className="space-y-1">
              <span className="text-sm text-muted">{step.k}</span>
              <h3 className="text-2xl">{step.title}</h3>
              <p className="text-sm text-muted">{si === 0 ? S.catHint(list.length) : step.hint}</p>
            </div>

            {step.items.map((item, ii) => {
              if ("widget" in item) {
                if (item.widget === "kitFilters") return <FamilyFilters key={ii} value={famF} onChange={setFamF} allLabel={S.allFamilies} />;
                return (
                  <div key={ii} role="group" aria-label="Business category" className="grid max-h-[26rem] gap-2 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((c) => (
                      <button
                        key={c.i}
                        type="button"
                        aria-pressed={s.cat === c.n}
                        onClick={() => update({ cat: c.n })}
                        className="min-h-11 rounded-md border border-line p-3 text-left hover:border-head aria-pressed:border-head aria-pressed:bg-fill aria-pressed:text-on-fill"
                      >
                        <span className="block font-medium">{c.n}</span>
                        <span className="block text-sm">Tier {c.tier} · {c.idx} · {c.price}</span>
                      </button>
                    ))}
                  </div>
                );
              }
              if ("devs" in item)
                return (
                  <div key={ii} role="group" aria-label="Working device" className="grid gap-3 md:grid-cols-2">
                    {item.devs.map((d) => (
                      <button
                        key={d.dev}
                        type="button"
                        aria-pressed={s.device === d.dev}
                        onClick={() => update({ device: d.dev as "desktop" | "mobile" })}
                        className="group space-y-2 rounded-lg border border-line p-4 text-left hover:border-head aria-pressed:border-2 aria-pressed:border-head aria-pressed:bg-surface"
                      >
                        <span className="flex items-center gap-2 text-sm text-muted">
                          <i aria-hidden className="grid size-5 place-items-center rounded-full border-2 border-head">
                            <span className={`size-2.5 rounded-full ${s.device === d.dev ? "bg-head" : ""}`} />
                          </i>
                          {d.pick}
                        </span>
                        <strong className="block text-xl">{d.title}</strong>
                        <p>{d.p}</p>
                      </button>
                    ))}
                  </div>
                );
              if ("note" in item)
                return <Note key={ii} tone={item.note.tone === "warn" ? "firm" : "plain"}><p className="max-w-3xl"><InlineView parts={item.note.inline} /></p></Note>;
              if ("fields" in item)
                return (
                  <div key={ii} className="grid gap-4 md:grid-cols-3">
                    {item.fields.map((f) => (
                      <Field key={f.id} id={f.id} label={f.label}>
                        {f.id === "stateSel" ? (
                          <Select
                            id={f.id}
                            value={s.st}
                            onChange={(e) => update({ st: e.target.value as StateCode | "", listCity: "", freeCity: "" })}
                          >
                            <option value="">{S.selectState}</option>
                            {states.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                          </Select>
                        ) : f.id === "citySel" ? (
                          <Select id={f.id} value={s.listCity} disabled={!s.st} onChange={(e) => update({ listCity: e.target.value, ...(e.target.value ? { freeCity: "" } : {}) })}>
                            <option value="">{s.st ? S.selectCity : S.selectStateFirst}</option>
                            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                          </Select>
                        ) : f.id === "cityFree" ? (
                          <Input id={f.id} value={s.freeCity} placeholder={f.placeholder} autoComplete="off" onChange={(e) => update({ freeCity: e.target.value, ...(e.target.value.trim() ? { listCity: "" } : {}) })} />
                        ) : (
                          <Input
                            id={f.id}
                            value={details[f.id === "yourName" ? "you" : f.id === "yourBrand" ? "brand" : "domain"]}
                            placeholder={f.placeholder}
                            autoComplete="off"
                            onChange={(e) => setDetails((d) => ({ ...d, [f.id === "yourName" ? "you" : f.id === "yourBrand" ? "brand" : "domain"]: e.target.value }))}
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                );
              return (
                <p key={ii} className="max-w-3xl text-sm text-muted">
                  {s.st && ii === step.items.length - 1 && step.k === "Step 3" ? S.cityNote(cities.length, STATES[s.st][0]) : <InlineView parts={item.p} />}
                </p>
              );
            })}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 p-4 sm:p-6">
          <Button disabled={!ready} onClick={() => build()}>{CONSOLE_CONTENT.run.build}</Button>
          <Button variant="secondary" onClick={reset}>{CONSOLE_CONTENT.run.reset}</Button>
          <span className="text-sm text-muted" aria-live="polite">{runStatus ?? (awaiting ? CONSOLE_CONTENT.run.status : statusLine(s))}</span>
        </div>
      </div>

      <div ref={kitRef} className="scroll-mt-20">
        {built && shown && (
          <div className="border-t border-head p-4 sm:p-6">
            <KitView
              kit={shown}
              extraChips={built.ck ? [] : ["Generic kit"]}
              onDirection={(d) => setS((cur) => ({ ...cur, dir: d }))}
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  <SaveKit input={built.input} direction={built.ck ? dir : "b"} mode={saveMode} />
                  <DownloadKit kit={shown} X={built.X} ck={built.ck} dir={dir} />
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

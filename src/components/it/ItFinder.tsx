"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addFinderBusinessAction } from "@/app/it/actions";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, Input, Select } from "@/components/ui/Field";
import { AlertIcon, ArrowRightIcon, CheckIcon, GlobeIcon, MapPinIcon } from "@/components/ui/Icons";
import { IconLink } from "@/components/ui/IconLink";
import { Note } from "@/components/ui/Note";
import { PhoneCell } from "@/components/ui/PhoneCell";
import { IT_FACTORS, itCategoriesFor, itCategoryTotal } from "@/lib/it/categories";
import { stateOptions } from "@/lib/console";
import { COUNTRIES, COUNTRY_CODES, regionCities, type Country, type RegionCode } from "@/lib/market/regions";
import { createSseParser } from "@/lib/scrape/http";
import { DEFAULT_LIMIT, LIMIT_OPTIONS, savedTodayLabel } from "@/lib/scrape/limits";
import { progressLine, type BusinessRow, type RunEvent, type StopCode } from "@/lib/scrape/types";

const BLOCKED: StopCode[] = ["captcha", "consent", "blocked", "unresponsive", "error"];
const enc = encodeURIComponent;

/** The IT finder: pick a country, an IT category, a region and a city; run the Maps search; add results to prospects. */
export function ItFinderPage({ canAdd }: { canAdd: boolean }) {
  const [country, setCountry] = useState<Country>("US");
  const [cat, setCat] = useState("");
  const [st, setSt] = useState<RegionCode | "">("");
  const [listCity, setListCity] = useState("");
  const [freeCity, setFreeCity] = useState("");
  const cats = useMemo(() => itCategoriesFor(country), [country]);
  const region = COUNTRIES[country].region;
  const city = freeCity.trim() || listCity;

  return (
    <div className="space-y-8">
      <div className="max-w-xs">
        <Field id="itf-country" label="Country">
          <Select id="itf-country" value={country} onChange={(e) => { setCountry(e.target.value as Country); setSt(""); setListCity(""); setFreeCity(""); }}>
            {COUNTRY_CODES.map((c) => <option key={c} value={c}>{COUNTRIES[c].name}</option>)}
          </Select>
        </Field>
      </div>
      <section aria-labelledby="itf-cat-h" className="space-y-3">
        <div className="space-y-1">
          <span className="text-sm text-muted">Step 1</span>
          <h2 id="itf-cat-h" className="text-2xl">Pick the kind of business</h2>
          <p className="text-sm text-muted">Scored out of 30 on the Reset&apos;s six factors ({IT_FACTORS.join(", ").toLowerCase()}). Judgement, not measured data; unreviewed.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <button key={c.n} type="button" aria-pressed={cat === c.n} onClick={() => setCat(c.n)}
              className="group min-h-11 rounded-md border border-line p-3 text-left hover:border-head aria-pressed:border-head aria-pressed:bg-fill aria-pressed:text-on-fill">
              <span className="block font-medium">{c.n} <span className="tabular-nums">· {itCategoryTotal(c)}/30</span></span>
              <span className="block text-sm">{c.note}</span>
              <span className="block pt-1 text-sm">Maps labels: {c.mapsLabels.join(", ")}</span>
            </button>
          ))}
        </div>
      </section>
      <section aria-labelledby="itf-place-h" className="space-y-3">
        <div className="space-y-1">
          <span className="text-sm text-muted">Step 2</span>
          <h2 id="itf-place-h" className="text-2xl">Choose the {region.toLowerCase()} and city</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="itf-st" label={region}>
            <Select id="itf-st" value={st} onChange={(e) => { setSt(e.target.value as RegionCode | ""); setListCity(""); setFreeCity(""); }}>
              <option value="">Choose a {region.toLowerCase()}</option>
              {stateOptions(country).map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </Select>
          </Field>
          <Field id="itf-city" label="City from the list">
            <Select id="itf-city" value={listCity} disabled={!st} onChange={(e) => { setListCity(e.target.value); if (e.target.value) setFreeCity(""); }}>
              <option value="">{st ? "Choose a city" : `Choose a ${region.toLowerCase()} first`}</option>
              {(st ? regionCities(st) : []).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field id="itf-free" label="Or type a city">
            <Input id="itf-free" value={freeCity} autoComplete="off" onChange={(e) => { setFreeCity(e.target.value); if (e.target.value.trim()) setListCity(""); }} />
          </Field>
        </div>
      </section>
      <div className="overflow-hidden rounded-lg border border-head">
        {cat && st && city
          ? <ItFinderRun cat={cat} st={st} city={city} canAdd={canAdd} />
          : <p className="p-4 text-muted sm:p-6">Choose a kind of business, a {region.toLowerCase()} and a city to begin.</p>}
      </div>
    </div>
  );
}

function ItFinderRun({ cat, st, city, canAdd }: { cat: string; st: string; city: string; canAdd: boolean }) {
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [savedToday, setSavedToday] = useState(0);
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [outcome, setOutcome] = useState<{ code: StopCode; reason: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const n = ++seq.current;
    try {
      const res = await fetch(`/api/it/finder?cat=${enc(cat)}&st=${enc(st)}&city=${enc(city)}`);
      const j = await res.json();
      if (n !== seq.current) return;
      if (!res.ok) { setLoadError(j.error ?? "Couldn't load the saved businesses."); return; }
      setLoadError(null);
      setSavedToday(j.savedToday);
      setRows(j.rows);
    } catch {
      if (n === seq.current) setLoadError("Couldn't load the saved businesses.");
    }
  }, [cat, st, city]);

  useEffect(() => {
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
  }, [refresh]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function find() {
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setOutcome(null);
    setProgress("Starting…");
    const handle = (e: RunEvent) => {
      if (e.type === "start") setSavedToday(e.info.savedToday);
      else if (e.type === "status") setProgress(e.message);
      else if (e.type === "progress") { setProgress(e.message); setSavedToday(e.savedToday); }
      else if (e.type === "saved") setRows((r) => [e.business, ...r.filter((x) => x.id !== e.business.id)]);
      else if (e.type === "done") { setProgress(progressLine(e)); setSavedToday(e.savedToday); setOutcome({ code: e.stopCode, reason: e.stopReason }); }
      else if (e.type === "failed") setOutcome({ code: "error", reason: e.message });
    };
    try {
      const res = await fetch("/api/it/finder/run", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: cat, state: st, city, limit }), signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        setOutcome({ code: "error", reason: j?.error ?? "The run could not start." });
        setProgress("");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parse = createSseParser();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const e of parse(decoder.decode(value, { stream: true }))) handle(e);
      }
    } catch {
      setOutcome(ac.signal.aborted ? { code: "cancelled", reason: "Stopped. What was saved so far is in the list." } : { code: "error", reason: "Lost the connection to the run." });
    } finally {
      abortRef.current = null;
      setRunning(false);
      await refresh();
    }
  }

  async function add(ids: string[]) {
    setAddError(null);
    const errors: string[] = [];
    for (const id of ids) {
      setAdding(id);
      const r = await addFinderBusinessAction(id);
      if (r.ok) setRows((rs) => rs.map((x) => (x.id === id ? { ...x, movedLeadId: r.prospectId } : x)));
      else errors.push(`${rows.find((x) => x.id === id)?.name ?? "A business"}: ${r.message}`);
    }
    setAdding(null);
    if (errors.length) setAddError(errors.join(" "));
  }

  const notAdded = rows.filter((r) => !r.movedLeadId);
  const columns: Column<BusinessRow>[] = [
    { id: "business", label: "Business", sort: (r) => r.name, cell: (r) => <><span className="block font-medium">{r.name}</span>{r.mapsCategory && <span className="block text-sm text-muted">{r.mapsCategory}</span>}</> },
    { id: "rating", label: "Rating", sort: (r) => r.rating, className: "whitespace-nowrap tabular-nums", cell: (r) => (r.rating === null ? "—" : `${r.rating}${r.reviewCount === null ? "" : ` (${r.reviewCount})`}`) },
    { id: "phone", label: "Phone", sort: (r) => r.phone, cell: (r) => <PhoneCell phone={r.phone} whatsapp={r.whatsapp} name={r.name} /> },
    { id: "email", label: "Email", sort: (r) => r.email, cell: (r) => (r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "—") },
    { id: "address", label: "Address", sort: (r) => r.address, cell: (r) => r.address || "—" },
    { id: "website", label: "Website", sort: (r) => r.websiteUrl, cell: (r) => (r.websiteUrl ? <IconLink href={r.websiteUrl} label={`Open the website of ${r.name}`} external><GlobeIcon /></IconLink> : "—") },
    { id: "maps", label: "Maps", srOnlyHeader: true, cell: (r) => <IconLink href={r.mapsUrl} label={`Open ${r.name} in Maps`} external><MapPinIcon /></IconLink> },
    {
      id: "prospect", label: "Prospect", srOnlyHeader: true,
      cell: (r) => r.movedLeadId
        ? <IconLink href={`/it/prospects/${r.movedLeadId}`} label={`Open the prospect for ${r.name}`}><ArrowRightIcon /></IconLink>
        : <Button variant="secondary" disabled={!canAdd || adding !== null} onClick={() => add([r.id])}>{adding === r.id ? "Adding…" : "Add to prospects"}<span className="sr-only"> {r.name}</span></Button>,
    },
  ];
  const limitReached = savedToday >= limit;

  return (
    <section aria-labelledby="itf-run-h" className="space-y-4 p-4 sm:p-6">
      <div className="space-y-1">
        <span className="text-sm text-muted">Runs on the server · Google Maps only</span>
        <h2 id="itf-run-h" className="text-2xl">Find {cat.toLowerCase()}</h2>
        <p className="max-w-3xl text-sm text-muted">
          Searches Google Maps for “{cat} in {city}, {st}”, opens each listing and saves its contact details here, in IT Prospects. Nothing becomes a local lead.
          One listing every few seconds; closing this page stops the run. Its daily limit is counted apart from the lead finder&apos;s.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-40">
          <Field id="itf-limit" label="Today's limit">
            <Select id="itf-limit" value={limit} disabled={running} onChange={(e) => setLimit(Number(e.target.value))}>{LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}</Select>
          </Field>
        </div>
        <Button onClick={find} disabled={running || limitReached}>{running ? "Finding…" : "Find businesses"}</Button>
        {running && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Stop</Button>}
        <span className="pb-3 text-base" aria-live="polite">{savedTodayLabel(savedToday, limit)}</span>
      </div>
      {limitReached && !running && <p className="text-sm text-muted">Today&apos;s limit is reached. Choose a higher limit, or come back tomorrow.</p>}
      {(running || progress) && <p role="status">{progress}</p>}
      {outcome && (
        <Note tone={BLOCKED.includes(outcome.code) ? "firm" : "plain"}>
          <p className="flex items-start gap-2" role={BLOCKED.includes(outcome.code) ? "alert" : "status"}>
            {BLOCKED.includes(outcome.code) ? <AlertIcon className="mt-0.5 shrink-0" /> : <CheckIcon className="mt-0.5 shrink-0" />}
            <span><strong>Run ended.</strong> {outcome.reason}</span>
          </p>
        </Note>
      )}
      {loadError && <Note tone="firm"><p role="alert">{loadError}</p></Note>}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg">Saved for {cat} in {city}, {st}</h3>
          {canAdd && notAdded.length > 1 && <Button variant="secondary" disabled={adding !== null} onClick={() => add(notAdded.map((r) => r.id))}>Add all {notAdded.length} to prospects</Button>}
        </div>
        {!canAdd && <p className="text-sm text-muted">Your role can&apos;t add prospects.</p>}
        {rows.length === 0
          ? <p className="text-muted">Nothing saved yet for this search. Click “Find businesses”.</p>
          : <DataTable label="Saved IT businesses" rows={rows} columns={columns} rowKey={(r) => r.id} minWidth={1100} pageSize={10} />}
        {addError && <p role="alert" className="flex items-center gap-2"><AlertIcon /> {addError}</p>}
      </div>
    </section>
  );
}

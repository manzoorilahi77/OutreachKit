"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { moveToLeads } from "@/components/scrape/actions";
import { WebsiteTabs } from "@/components/scrape/WebsiteTabs";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { AlertIcon, ArrowRightIcon, CheckIcon, GlobeIcon, MapPinIcon } from "@/components/ui/Icons";
import { IconLink } from "@/components/ui/IconLink";
import { PhoneCell } from "@/components/ui/PhoneCell";
import { Note } from "@/components/ui/Note";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { createSseParser } from "@/lib/scrape/http";
import { DEFAULT_LIMIT, LIMIT_OPTIONS, localDay, savedTodayLabel } from "@/lib/scrape/limits";
import { splitByWebsite, type WebsiteTab } from "@/lib/scrape/tabs";
import { progressLine, type BusinessRow, type RunEvent, type StopCode } from "@/lib/scrape/types";

interface Props {
  cat: string | null;
  st: string;
  city: string;
  /** The person can add leads, so "Add to leads" is on. */
  canMove: boolean;
}

type Outcome = { code: StopCode; reason: string };
/** Stops that mean Google (not the user) ended the run. They get the firm border and an alert role. */
const BLOCKED: StopCode[] = ["captcha", "consent", "blocked", "unresponsive", "error"];

const enc = encodeURIComponent;

/**
 * "Find businesses": runs the local Google Maps lead finder for the chosen category and city. It saves every business the listing
 * shows, with or without a website, and adds each as a lead. Renders nothing unless the server says the finder is on for this person (the workspace switch and their role).
 */
export function LeadFinder({ cat, st, city, canMove }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [savedToday, setSavedToday] = useState(0);
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [tab, setTab] = useState<WebsiteTab>("without");
  const abortRef = useRef<AbortController | null>(null);
  const loadSeq = useRef(0);

  const ready = !!(cat && st && city);
  const searchKey = ready ? `${cat}|${st}|${city}` : "";
  const searchKeyRef = useRef(searchKey);
  searchKeyRef.current = searchKey;

  // Is the finder on? The route answers 404 when the workspace switch is off or the role can't run it.
  useEffect(() => {
    let live = true;
    fetch("/api/leadfinder")
      .then(async (res) => {
        if (!live) return;
        setEnabled(res.ok || res.status === 503);
        const j = await res.json().catch(() => null);
        if (j?.error) setLoadError(j.error);
        if (typeof j?.savedToday === "number") setSavedToday(j.savedToday);
      })
      .catch(() => live && setEnabled(false));
    return () => { live = false; };
  }, []);

  // Leaving the page ends a run in progress (the server keeps what it saved).
  useEffect(() => () => abortRef.current?.abort(), []);

  const refresh = useCallback(async () => {
    if (!cat || !st || !city) return;
    const seq = ++loadSeq.current;
    try {
      const res = await fetch(`/api/leadfinder?cat=${enc(cat)}&st=${enc(st)}&city=${enc(city)}`);
      const j = await res.json();
      if (seq !== loadSeq.current) return;
      if (!res.ok) { setLoadError(j.error ?? "Couldn't load the saved businesses."); return; }
      setLoadError(null);
      setSavedToday(j.savedToday);
      setRows(j.rows);
    } catch {
      if (seq === loadSeq.current) setLoadError("Couldn't load the saved businesses.");
    }
  }, [cat, st, city]);

  // Load the list for the current category and city (typing a city is debounced).
  useEffect(() => {
    if (!enabled || !ready) return;
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
  }, [enabled, ready, refresh]);

  async function find() {
    if (!cat) return;
    const ac = new AbortController();
    abortRef.current = ac;
    const startedFor = searchKey;
    setRunning(true);
    setOutcome(null);
    setMoveError(null);
    setProgress("Starting…");

    const handle = (e: RunEvent) => {
      if (e.type === "start") setSavedToday(e.info.savedToday);
      else if (e.type === "status") setProgress(e.message);
      else if (e.type === "progress") { setProgress(e.message); setSavedToday(e.savedToday); }
      else if (e.type === "saved") {
        if (searchKeyRef.current === startedFor) setRows((r) => [e.business, ...r.filter((x) => x.id !== e.business.id)]);
      } else if (e.type === "done") {
        setProgress(progressLine(e));
        setSavedToday(e.savedToday);
        setOutcome({ code: e.stopCode, reason: e.stopReason });
      } else if (e.type === "failed") setOutcome({ code: "error", reason: e.message });
    };

    try {
      const res = await fetch("/api/leadfinder/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, state: st, city, limit }),
        signal: ac.signal,
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

  async function move(row: BusinessRow) {
    setMoving(row.id);
    setMoveError(null);
    const result = await moveToLeads(row.id, localDay());
    setMoving(null);
    if (result.ok) setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, movedLeadId: result.leadId } : r)));
    else setMoveError(result.message);
  }

  const baseColumns: Column<BusinessRow>[] = [
    { id: "business", label: "Business", sort: (r) => r.name, cell: (r) => (<><span className="block font-medium">{r.name}</span>{r.mapsCategory && <span className="block text-sm text-muted">{r.mapsCategory}</span>}</>) },
    { id: "saved", label: "Saved", sort: (r) => r.scrapedAt, className: "whitespace-nowrap", cell: (r) => r.scrapedOn },
    { id: "phone", label: "Phone", sort: (r) => r.phone, cell: (r) => <PhoneCell phone={r.phone} whatsapp={r.whatsapp} name={r.name} /> },
    { id: "address", label: "Address", sort: (r) => r.address, cell: (r) => r.address || "—" },
    { id: "rating", label: "Rating", sort: (r) => r.rating, className: "whitespace-nowrap tabular-nums", cell: (r) => (r.rating === null ? "—" : `${r.rating}${r.reviewCount === null ? "" : ` (${r.reviewCount})`}`) },
    { id: "email", label: "Email", sort: (r) => r.email, cell: (r) => (r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : "—") },
    {
      id: "social", label: "Social", sort: (r) => [r.facebookUrl, r.instagramUrl].filter(Boolean).length + r.otherLinks.length,
      cell: (r) => (
        <ul className="space-y-1">
          {r.facebookUrl && <li><ExternalLink href={r.facebookUrl}>Facebook</ExternalLink></li>}
          {r.instagramUrl && <li><ExternalLink href={r.instagramUrl}>Instagram</ExternalLink></li>}
          {r.otherLinks.map((l) => <li key={l.url}><ExternalLink href={l.url}>{l.label}</ExternalLink></li>)}
          {!r.facebookUrl && !r.instagramUrl && r.otherLinks.length === 0 && <li>—</li>}
        </ul>
      ),
    },
    { id: "maps", label: "Maps", srOnlyHeader: true, cell: (r) => <IconLink href={r.mapsUrl} label={`Open ${r.name} in Maps`} external><MapPinIcon /></IconLink> },
  ];

  const websiteColumn: Column<BusinessRow> = {
    id: "website", label: "Website", sort: (r) => r.websiteUrl,
    cell: (r) => (r.websiteUrl ? (
      <IconLink href={r.websiteUrl} label={`Open the website of ${r.name}: ${hostOf(r.websiteUrl)}`} external><GlobeIcon /></IconLink>
    ) : "—"),
  };
  const leadColumn: Column<BusinessRow> = {
    id: "lead", label: "Lead", srOnlyHeader: true,
    cell: (r) => r.movedLeadId ? (
      <IconLink href={`/leads/${r.movedLeadId}`} label={`Open the lead for ${r.name}`}><ArrowRightIcon /></IconLink>
    ) : (
      <Button variant="secondary" disabled={!canMove || moving === r.id} onClick={() => move(r)}>
        {moving === r.id ? "Adding…" : "Add to leads"}
        <span className="sr-only"> {r.name}</span>
      </Button>
    ),
  };

  if (!enabled || !ready) return null;

  const limitReached = savedToday >= limit;
  const split = splitByWebsite(rows);
  const shown = split[tab];
  const columns = tab === "with" ? [...baseColumns, websiteColumn, leadColumn] : [...baseColumns, leadColumn];

  return (
    <section id="finder" aria-labelledby="lf-title" className="scroll-mt-20 space-y-4 p-4 sm:p-6">
      <div className="space-y-1">
        <span className="text-sm text-muted">Optional · runs on this computer</span>
        <h3 id="lf-title" className="text-2xl">Find businesses</h3>
        <p className="max-w-3xl text-sm text-muted">
          Searches Google Maps for “{cat} in {city}, {st}”, opens each listing and saves every business with every contact detail the
          listing shows, whether or not it has a website. Each one is added to your leads as it is saved. It visits Google Maps and
          nothing else, one listing every few seconds, so a run takes longer than it looks; closing this page stops it.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-40">
          <Field id="lf-limit" label="Today's limit">
            <Select id="lf-limit" value={limit} disabled={running} onChange={(e) => setLimit(Number(e.target.value))}>
              {LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        </div>
        <Button onClick={find} disabled={running || limitReached}>{running ? "Finding…" : "Find businesses"}</Button>
        {running && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Stop</Button>}
        <span className="pb-3 text-base" aria-live="polite">{savedTodayLabel(savedToday, limit)}</span>
      </div>

      {limitReached && !running && <p className="text-sm text-muted">Today’s limit is reached. Choose a higher limit, or come back tomorrow.</p>}
      {(running || progress) && <p className="text-base" role="status">{progress}</p>}
      {outcome && (
        <Note tone={BLOCKED.includes(outcome.code) ? "firm" : "plain"}>
          <p className="flex items-start gap-2" role={BLOCKED.includes(outcome.code) ? "alert" : "status"}>
            {BLOCKED.includes(outcome.code) ? <AlertIcon className="mt-0.5 shrink-0" /> : <CheckIcon className="mt-0.5 shrink-0" />}
            <span><strong>Run ended.</strong> {outcome.reason}</span>
          </p>
        </Note>
      )}
      {loadError && <Note tone="firm"><p role="alert">{loadError}</p></Note>}

      <div className="space-y-2">
        <h4 className="text-lg">Saved for {cat} in {city}, {st}</h4>
        {!canMove && <p className="text-sm text-muted">Your role can’t add leads, so businesses that aren’t leads yet can’t be added.</p>}
        <WebsiteTabs idBase="lf" value={tab} counts={{ without: split.without.length, with: split.with.length }} onChange={setTab} />
        <div id="lf-panel" role="tabpanel" aria-labelledby={`lf-tab-${tab}`} className="space-y-2 pt-2">
          {shown.length === 0 ? (
            <p className="text-muted">
              {rows.length === 0
                ? "Nothing saved yet for this category and city. Click “Find businesses”."
                : tab === "with" ? "No saved business with a website for this category and city." : "No saved business without a website for this category and city."}
            </p>
          ) : (
            <DataTable key={tab} label={tab === "with" ? "Businesses with a website" : "Businesses without a website"} rows={shown} columns={columns} rowKey={(r) => r.id} minWidth={1120} pageSize={10} />
          )}
        </div>
        {moveError && <p role="alert" className="flex items-center gap-2"><AlertIcon /> {moveError}</p>}
      </div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

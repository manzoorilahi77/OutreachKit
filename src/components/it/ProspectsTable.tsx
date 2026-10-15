"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneCell } from "@/components/ui/PhoneCell";
import { daysSince, IT_STAGES, itStageLabel, SEGMENTS, segmentInfo, SIGNAL_TYPES, signalInfo, TIER_LABEL, type ItProspectView } from "@/lib/it/model";
import { COUNTRIES, COUNTRY_CODES } from "@/lib/market/regions";

export interface ProspectFilters { segment: string; stage: string; signal: string; type: string; country: string; tier: string; who: string; q: string }

const AGE: Record<string, string> = { fresh: "Fresh", stale: "Stale", none: "No signal" };

/** The prospects list: filters on top (kept in the address bar so a link can share them), then a sortable table. */
export function ProspectsTable({ rows, names, me, initial, showWho, today }: {
  rows: ItProspectView[]; names: Record<string, string>; me: string; initial: ProspectFilters; showWho: boolean; today: string;
}) {
  const [f, setF] = useState<ProspectFilters>(initial);
  const set = (k: keyof ProspectFilters, v: string) => {
    const next = { ...f, [k]: v };
    setF(next);
    const q = new URLSearchParams(Object.entries(next).filter(([, x]) => x));
    window.history.replaceState(null, "", `/it/prospects${q.size ? `?${q}` : ""}`);
  };
  const nameOf = (u: string) => (u === me ? "You" : (names[u] ?? u));
  const people = [...new Set(rows.flatMap((r) => [r.owner, r.assignee].filter((x): x is string => !!x)))].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return rows.filter((r) =>
      (!f.segment || r.segment === f.segment) && (!f.stage || r.stage === f.stage) && (!f.signal || r.signalState === f.signal) &&
      (!f.type || r.signals.some((s) => s.type === f.type)) && (!f.country || r.country === f.country) && (!f.tier || r.tier === f.tier) &&
      (!f.who || r.owner === f.who || r.assignee === f.who) &&
      (!q || [r.company, r.companyDomain, r.contactName, r.city, r.notes].some((x) => x.toLowerCase().includes(q))));
  }, [rows, f]);

  const columns: Column<ItProspectView>[] = [
    { id: "company", label: "Company", sort: (r) => r.company.toLowerCase(), cell: (r) => (
      <><Link href={`/it/prospects/${r.id}`} className="font-medium">{r.company}</Link>{r.companyDomain && <span className="block text-sm text-muted">{r.companyDomain}</span>}</>
    ) },
    { id: "segment", label: "Segment", sort: (r) => r.segment, cell: (r) => segmentInfo(r.segment).short, className: "whitespace-nowrap" },
    { id: "stage", label: "Stage", sort: (r) => IT_STAGES.findIndex((s) => s.value === r.stage), cell: (r) => itStageLabel(r.stage), className: "whitespace-nowrap" },
    { id: "score", label: "Score", sort: (r) => r.score, cell: (r) => <span className="flex items-center gap-2 whitespace-nowrap"><Chip variant={r.tier}>{TIER_LABEL[r.tier]}</Chip><span className="tabular-nums">{r.score}/6</span></span> },
    { id: "signal", label: "Newest signal", sort: (r) => r.latest?.signalDate ?? "", cell: (r) => r.latest ? (
      <span className="block">
        <span className="block">{signalInfo(r.latest.type).label}</span>
        <span className="block text-sm text-muted">{AGE[r.signalState]}{r.latest.signalDate ? ` · ${daysSince(r.latest.signalDate, today)} days ago` : " · no date"}</span>
      </span>
    ) : <span className="text-muted">None</span> },
    { id: "contact", label: "Contact", sort: (r) => r.contactName.toLowerCase(), cell: (r) => (
      <span className="block">{r.contactName || <span className="text-muted">—</span>}{r.contactTitle && <span className="block text-sm text-muted">{r.contactTitle}</span>}</span>
    ) },
    { id: "phone", label: "Phone", cell: (r) => <PhoneCell phone={r.phone} whatsapp={r.whatsapp} name={r.company} /> },
    { id: "where", label: "Where", sort: (r) => `${r.country}${r.region}${r.city}`, cell: (r) => [r.city, r.region, r.country !== "US" ? COUNTRIES[r.country].short : ""].filter(Boolean).join(", ") || "—" },
    ...(showWho ? [{ id: "who", label: "Owner", sort: (r: ItProspectView) => nameOf(r.owner), cell: (r: ItProspectView) => <>{nameOf(r.owner)}{r.assignee && <span className="block text-sm text-muted">With {nameOf(r.assignee)}</span>}</> }] : []),
  ];

  const sel = (id: keyof ProspectFilters, label: string, options: [string, string][]) => (
    <Field id={`f-${id}`} label={label}>
      <Select id={`f-${id}`} value={f[id]} onChange={(e) => set(id, e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    </Field>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="f-q" label="Search"><Input id="f-q" type="search" value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Company, domain, contact, city" /></Field>
        {sel("segment", "Segment", SEGMENTS.map((x) => [x.value, x.short]))}
        {sel("stage", "Stage", IT_STAGES.map((x) => [x.value, x.label]))}
        {sel("tier", "Score", [["hot", "Hot (5–6)"], ["warm", "Warm (3–4)"], ["skip", "Skip (0–2)"]])}
        {sel("signal", "Signal age", [["fresh", "Fresh"], ["stale", "Stale"], ["none", "No signal"]])}
        {sel("type", "Signal type", SIGNAL_TYPES.map((x) => [x.value, x.label]))}
        {sel("country", "Country", COUNTRY_CODES.map((c) => [c, COUNTRIES[c].name]))}
        {showWho && sel("who", "Person", people.map((u) => [u, nameOf(u)]))}
      </div>
      <DataTable label="IT prospects" rows={shown} columns={columns} rowKey={(r) => r.id} minWidth={1100} defaultSort={{ id: "score", dir: "desc" }} />
    </div>
  );
}

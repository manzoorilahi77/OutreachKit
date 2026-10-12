"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FLOW_RANK, stageLabel, channelLabel, type Channel, type Stage } from "@/lib/leads/stages";
import { DueText } from "./DueText";

export interface LeadRowData {
  id: string;
  business: string;
  /** The business category, shown under the name. */
  category: string;
  /** City and state. */
  where: string;
  tier: "hot" | "warm" | "skip";
  score: number;
  stage: Stage;
  next: string | null;
  channel: Channel | null;
  /** Who holds it, already worded ("You", "With Ravi", "Unassigned"), when the table shows that column. */
  holder: string;
}

const TIER = { hot: "Hot", warm: "Warm", skip: "Skip" } as const;
/** Tier as a dot and a word: Hot is the one Electric Blue mark, Warm is navy, Skip is a quiet grey. */
function TierText({ tier }: { tier: LeadRowData["tier"] }) {
  const dot = tier === "hot" ? "bg-accent" : tier === "warm" ? "bg-head" : "bg-line";
  return <><span aria-hidden className={`mr-2 inline-block size-2 rounded-full align-[1px] ${dot}`} />{TIER[tier]}</>;
}

const TIER_ORDER = { hot: 3, warm: 2, skip: 1 } as const;

/** The leads list: S.No, sortable columns and pages. Sorted by next action by default, empty dates last. */
export function LeadsTable({ rows, showHolder, holderLabel }: { rows: LeadRowData[]; showHolder: boolean; holderLabel: string }) {
  const columns: Column<LeadRowData>[] = [
    { id: "business", label: "Business", sort: (r) => r.business, cell: (r) => (<><Link href={`/leads/${r.id}`} className="text-lg font-medium no-underline hover:underline">{r.business}</Link>{r.category && <span className="block text-sm text-muted">{r.category}</span>}</>) },
    { id: "where", label: "Where", sort: (r) => r.where, cell: (r) => r.where },
    { id: "tier", label: "Tier", sort: (r) => TIER_ORDER[r.tier], className: "whitespace-nowrap", cell: (r) => <TierText tier={r.tier} /> },
    { id: "score", label: "Score", sort: (r) => r.score, className: "tabular-nums whitespace-nowrap", cell: (r) => <>{r.score} <span className="text-muted">/ 10</span></> },
    { id: "stage", label: "Stage", sort: (r) => FLOW_RANK[r.stage] ?? 99, cell: (r) => stageLabel(r.stage) },
    { id: "next", label: "Next action", sort: (r) => r.next, cell: (r) => <DueText date={r.next} /> },
    { id: "channel", label: "Channel", sort: (r) => channelLabel(r.channel), cell: (r) => channelLabel(r.channel) },
    ...(showHolder ? [{ id: "holder", label: holderLabel, sort: (r: LeadRowData) => r.holder, cell: (r: LeadRowData) => r.holder } satisfies Column<LeadRowData>] : []),
  ];
  return <DataTable label="Leads" rows={rows} columns={columns} rowKey={(r) => r.id} minWidth={showHolder ? 1040 : 920} defaultSort={{ id: "next", dir: "asc" }} />;
}

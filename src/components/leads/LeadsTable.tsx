"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { GlobeIcon, MapPinIcon } from "@/components/ui/Icons";
import { IconLink } from "@/components/ui/IconLink";
import type { WebsiteStatus } from "@/lib/leads/website";
import { FLOW_RANK, stageLabel, channelLabel, type Channel, type Stage } from "@/lib/leads/stages";
import { PhoneCell } from "@/components/ui/PhoneCell";
import { SizeBadge } from "@/components/catalog/CatalogControls";
import type { Size } from "@/lib/kit/extBoard";
import { COUNTRIES, type Country } from "@/lib/market/regions";

export interface LeadRowData {
  id: string;
  business: string;
  /** The business category, shown under the name. */
  category: string;
  /** City and state. */
  where: string;
  /** The category's business size, when it is on the board. */
  size?: Size | null;
  /** Shown next to the place when it isn't the US. */
  country?: Country | null;
  stage: Stage;
  phone: string;
  /** The WhatsApp number or wa.me link, "" when the lead has none. */
  whatsapp: string;
  channel: Channel | null;
  /** Whether the lead has a website, the website's address and the Google Maps link ("" when the lead has none). */
  website: WebsiteStatus;
  websiteUrl: string;
  mapsUrl: string;
  /** Who holds it, already worded ("You", "With Ravi", "Unassigned"), when the table shows that column. */
  holder: string;
}

/** The leads list: S.No, sortable columns and pages. */
export function LeadsTable({ rows, showHolder, holderLabel }: { rows: LeadRowData[]; showHolder: boolean; holderLabel: string }) {
  const columns: Column<LeadRowData>[] = [
    { id: "business", label: "Business", sort: (r) => r.business, cell: (r) => (<><Link href={`/leads/${r.id}`} className="text-lg font-medium no-underline hover:underline">{r.business}</Link>{r.category && <span className="block text-sm text-muted">{r.category}</span>}{r.size === "mid" && <span className="mt-1 block"><SizeBadge size="mid" /></span>}</>) },
    { id: "where", label: "Where", sort: (r) => r.where, cell: (r) => (r.country && r.country !== "US" ? `${r.where} · ${COUNTRIES[r.country].short}` : r.where) },
    { id: "stage", label: "Stage", sort: (r) => FLOW_RANK[r.stage] ?? 99, cell: (r) => stageLabel(r.stage) },
    { id: "phone", label: "Phone", sort: (r) => r.phone, cell: (r) => <PhoneCell phone={r.phone} whatsapp={r.whatsapp} name={r.business} /> },
    { id: "channel", label: "Channel", sort: (r) => channelLabel(r.channel), cell: (r) => channelLabel(r.channel) },
    {
      id: "website", label: "Website", sort: (r) => r.website, className: "whitespace-nowrap",
      cell: (r) => r.websiteUrl ? <IconLink href={r.websiteUrl} label={`Open the website of ${r.business}`} external><GlobeIcon /></IconLink> : r.website === "with" ? "Yes" : r.website === "without" ? "No" : "—",
    },
    { id: "maps", label: "Maps", srOnlyHeader: true, cell: (r) => r.mapsUrl ? <IconLink href={r.mapsUrl} label={`Open ${r.business} in Maps`} external><MapPinIcon /></IconLink> : "—" },
    ...(showHolder ? [{ id: "holder", label: holderLabel, sort: (r: LeadRowData) => r.holder, cell: (r: LeadRowData) => r.holder } satisfies Column<LeadRowData>] : []),
  ];
  return <DataTable label="Leads" rows={rows} columns={columns} rowKey={(r) => r.id} minWidth={showHolder ? 1080 : 960} />;
}

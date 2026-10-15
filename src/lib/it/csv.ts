// IT Prospects export: one row per prospect with its newest signal. Cells are made safe for spreadsheets.
import { csvField, safeCell } from "@/lib/leads/csv";
import { itStageLabel, QUALIFIER, segmentInfo, signalInfo, TIER_LABEL, type ItProspectView } from "./model";

export const IT_CSV_COLS = [
  "Company", "Segment", "Stage", "Score", "Tier", "Website", "Domain", "LinkedIn", "Contact name", "Title", "Email", "Phone", "WhatsApp", "City", "State",
  "Country", "Team size", "Signal type", "Signal URL", "Signal date", "Signal state", "Quote", "Source", "Owner", "Assignee", "Qualifier ticked", "Notes", "Added",
] as const;

export function prospectsToCsv(rows: ItProspectView[], nameOf: (u: string) => string = (u) => u): string {
  const lines = [IT_CSV_COLS.map(csvField).join(",")];
  for (const p of rows) {
    const s = p.latest;
    const cells = [
      p.company, segmentInfo(p.segment).short, itStageLabel(p.stage), String(p.score), TIER_LABEL[p.tier], p.websiteUrl, p.companyDomain, p.linkedinUrl,
      p.contactName, p.contactTitle, p.email, p.phone, p.whatsapp, p.city, p.region, p.country, p.teamSize,
      s ? signalInfo(s.type).label : "", s?.url ?? "", s?.signalDate ?? "", p.signalState, s?.quote ?? "", s?.source ?? "",
      nameOf(p.owner), p.assignee ? nameOf(p.assignee) : "", QUALIFIER.filter((q) => p.qualifier[q.key]).map((q) => q.label).join("; "), p.notes, p.createdAt.slice(0, 10),
    ];
    lines.push(cells.map((c) => csvField(safeCell(c))).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

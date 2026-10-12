import Link from "next/link";
import { Note } from "@/components/ui/Note";
import { stageLabel } from "@/lib/leads/stages";
import type { Notice } from "@/lib/notices";

/** "Meera's lead Smith Roofing reached Replied": in-app only, computed from the synced events. */
export function Notices({ notices, names, limit = 8 }: { notices: Notice[]; names: Map<string, string>; limit?: number }) {
  if (!notices.length) return <Note tone="quiet"><p>No replies, calls booked, proposals or wins in the last 14 days.</p></Note>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
      {notices.slice(0, limit).map((n, i) => (
        <li key={n.leadId + n.stage + i} className="flex flex-wrap items-center justify-between gap-2 bg-surface p-3">
          <span><strong>{names.get(n.owner) ?? n.owner}</strong>: <Link href={`/leads/${n.leadId}`}>{n.business}</Link> reached {stageLabel(n.stage)}</span>
          <span className="tabular-nums text-muted">{n.at.slice(0, 10)}</span>
        </li>
      ))}
    </ul>
  );
}

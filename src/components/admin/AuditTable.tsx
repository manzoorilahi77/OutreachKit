import { TableWrap, td, th } from "@/components/ui/TableWrap";
import type { AuditEntry } from "@/lib/store/types";

export function AuditTable({ entries, names }: { entries: AuditEntry[]; names: Map<string, string> }) {
  if (!entries.length) return <p className="text-muted">Nothing has been logged yet.</p>;
  return (
    <TableWrap label="Audit log, newest first" minWidth={760}>
      <thead><tr>{["When", "Who", "Action", "On", "Detail"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className={`${td} whitespace-nowrap tabular-nums`}>{e.at.slice(0, 16).replace("T", " ")}</td>
            <td className={td}>{names.get(e.actor) ?? e.actor}</td>
            <td className={td}>{e.action}</td>
            <td className={td}>{e.target}</td>
            <td className={td}>{e.detail || "—"}</td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

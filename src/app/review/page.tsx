import type { Metadata } from "next";
import Link from "next/link";
import { Notices } from "@/components/team/Notices";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { todayIso } from "@/lib/clock";
import { noticesFrom } from "@/lib/notices";
import { stageLabel } from "@/lib/leads/stages";

export const metadata: Metadata = { title: "Weekly review" };

const WEEK_MS = 7 * 86_400_000;

/** The last seven days, for the person's own leads, their team's, or everyone's, by their weekly-review scope. */
export default async function ReviewPage() {
  const s = await requirePerm("review.weekly");
  const store = storeFor(s);
  const scope = s.perms["review.weekly"].scope;
  const [data, dir] = await Promise.all([store.readScope("review.weekly"), store.directory()]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  const since = Date.now() - WEEK_MS;
  const week = data.events.filter((e) => Date.parse(e.created_at) >= since);
  const moves = week.filter((e) => e.kind === "stage_change" && e.from_stage !== null);
  const added = week.filter((e) => e.kind === "stage_change" && e.from_stage === null);
  const touches = week.filter((e) => e.kind === "touch");
  const today = todayIso();
  const overdue = data.leads.filter((l) => l.next_action_date !== null && l.next_action_date < today && l.stage !== "won" && l.stage !== "lost");
  const byTo = new Map<string, number>();
  for (const e of moves) if (e.to_stage) byTo.set(e.to_stage, (byTo.get(e.to_stage) ?? 0) + 1);
  const people = [...new Set(data.events.map((e) => e.by))].filter((p) => data.owners.includes(p)).sort();
  const notices = noticesFrom(data.events, data.leads, Date.now(), 7);
  const label = scope === "own" ? "your leads" : scope === "team" ? "your team's leads" : "everyone's leads";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Weekly review" title="Last seven days" sub={`What changed on ${label}. Run it once a week and decide what to push next.`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Leads added" value={String(added.length)} />
        <StatTile label="Stage moves" value={String(moves.length)} />
        <StatTile label="Touches logged" value={String(touches.length)} />
        <StatTile label="Overdue next actions" value={String(overdue.length)} />
      </div>

      <section aria-labelledby="mv-h" className="space-y-3">
        <h2 id="mv-h" className="text-2xl">Where leads moved to</h2>
        {!byTo.size ? <p className="text-muted">No stage moves this week.</p> : (
          <TableWrap label="Moves by stage" minWidth={360}>
            <thead><tr><th scope="col" className={th}>Moved to</th><th scope="col" className={th}>Leads</th></tr></thead>
            <tbody>{[...byTo.entries()].map(([st, n]) => <tr key={st}><td className={td}>{stageLabel(st as never)}</td><td className={`${td} tabular-nums`}>{n}</td></tr>)}</tbody>
          </TableWrap>
        )}
      </section>

      {scope !== "own" && (
        <section aria-labelledby="pp-h" className="space-y-3">
          <h2 id="pp-h" className="text-2xl">By person</h2>
          <TableWrap label="This week by person" minWidth={560}>
            <thead><tr>{["Person", "Added", "Moves", "Touches"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p}>
                  <td className={`${td} font-medium`}>{names.get(p) ?? p}</td>
                  <td className={`${td} tabular-nums`}>{added.filter((e) => e.by === p).length}</td>
                  <td className={`${td} tabular-nums`}>{moves.filter((e) => e.by === p).length}</td>
                  <td className={`${td} tabular-nums`}>{touches.filter((e) => e.by === p).length}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </section>
      )}

      <section aria-labelledby="rw-h" className="space-y-3">
        <h2 id="rw-h" className="text-2xl">Replies and wins</h2>
        <Notices notices={notices} names={names} />
      </section>
      <p><Link href="/leads">Open the leads</Link></p>
    </div>
  );
}

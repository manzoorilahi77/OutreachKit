import type { Metadata } from "next";
import Link from "next/link";
import { Notices } from "@/components/team/Notices";
import { RequiredReading } from "@/components/team/RequiredReading";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { STAGES } from "@/lib/leads/stages";
import { countByStage, noticesFrom } from "@/lib/notices";

export const metadata: Metadata = { title: "Team today" };

export default async function TeamPage() {
  const s = await requirePerm("leads.assign");
  const store = storeFor(s);
  const scopeData = await store.readScope("leads.view");
  const [queue, dir, assignments, pb, required, teams] = await Promise.all([
    store.unassignedQueue(), store.directory(), store.listAssignments(), store.getPlaybook(), store.requiredFor(s.user.username), store.getTeams(),
  ]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  const notices = noticesFrom(scopeData.events, scopeData.leads, Date.now());
  const waiting = scopeData.leads.filter((l) => l.pendingTo);
  const stages = countByStage(scopeData.leads);
  const bds = dir.filter((d) => d.role === "bd" && d.status === "active" && scopeData.owners.includes(d.username));
  const teamName = teams.teams.find((t) => t.id === s.user.team)?.name;
  void assignments;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Team today" title={teamName ?? "Your team"} sub="Where your BDs are, what is waiting for you, and who has just replied." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="In the queue" value={String(queue.length)} note="Waiting for a BD" />
        <StatTile label="Not accepted yet" value={String(waiting.length)} note="Assigned, waiting for the BD" />
        <StatTile label="Open team leads" value={String(scopeData.leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length)} />
        <StatTile label="Won" value={String(stages.get("won") ?? 0)} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5">
        <Link href="/queue" className="inline-flex min-h-11 items-center font-medium">Unassigned queue ({queue.length})</Link>
        {can(s, "leads.handover") && <Link href="/handover" className="inline-flex min-h-11 items-center">Hand over leads</Link>}
        <Link href="/review" className="inline-flex min-h-11 items-center">Weekly review</Link>
        <Link href="/playbook/progress" className="inline-flex min-h-11 items-center">Playbook progress</Link>
      </div>

      <RequiredReading required={required} reads={pb.reads} />

      <section aria-labelledby="not-h" className="space-y-3">
        <h2 id="not-h" className="text-2xl">Replies and wins</h2>
        <Notices notices={notices} names={names} />
      </section>

      <section aria-labelledby="pipe-h" className="space-y-3">
        <h2 id="pipe-h" className="text-2xl">Pipeline by BD</h2>
        <TableWrap label="Pipeline by BD" minWidth={760}>
          <thead>
            <tr><th scope="col" className={th}>BD</th>{STAGES.slice(0, 8).map((x) => <th key={x.value} scope="col" className={th}>{x.label}</th>)}</tr>
          </thead>
          <tbody>
            {bds.map((b) => {
              const c = countByStage(scopeData.leads.filter((l) => l.owner === b.username));
              return (
                <tr key={b.username}>
                  <td className={`${td} font-medium`}>{b.fullName}</td>
                  {STAGES.slice(0, 8).map((x) => <td key={x.value} className={`${td} tabular-nums`}>{c.get(x.value) ?? 0}</td>)}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        <p className="text-sm text-muted">Read-only. Open <Link href="/leads">Team leads</Link> for the rows, and comment on any lead.</p>
      </section>
    </div>
  );
}

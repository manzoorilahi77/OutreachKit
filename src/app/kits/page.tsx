import type { Metadata } from "next";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { SectionHead } from "@/components/ui/SectionHead";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { DueText } from "@/components/leads/DueText";
import { agoText } from "@/lib/ago";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { KIT_STATUS_LABEL } from "@/lib/store/kitText";
import type { KitStats } from "@/lib/store/store";
import type { KitRecord } from "@/lib/store/types";

export const metadata: Metadata = { title: "Kits" };

function KitTable({ kits, stats, label }: { kits: KitRecord[]; stats: Map<string, KitStats>; label: string }) {
  return (
    <TableWrap label={label} minWidth={880}>
      <thead>
        <tr>{["Kit", "Status", "Leads", "Contacted", "Replied", "Next due", "Last activity"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {kits.map((k) => {
          const st = stats.get(k.id)!;
          return (
            <tr key={k.id}>
              <td className={`${td} font-medium`}><Link href={`/kits/${k.id}`}>{k.title}</Link></td>
              <td className={td}><Chip variant={k.status === "active" ? "tier-a" : "plain"}>{KIT_STATUS_LABEL[k.status]}</Chip></td>
              <td className={`${td} tabular-nums`}>{st.leads}</td>
              <td className={`${td} tabular-nums`}>{st.contacted}</td>
              <td className={`${td} tabular-nums`}>{st.replied}</td>
              <td className={td}><DueText date={st.nextDue} /></td>
              <td className={`${td} whitespace-nowrap`}>{st.lastActivity ? agoText(Date.parse(st.lastActivity), Date.now()) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </TableWrap>
  );
}

export default async function KitsPage() {
  const s = await requirePerm("kits.view");
  const store = storeFor(s);
  const scope = s.perms["kits.view"].scope;
  const [kits, dir, teams] = await Promise.all([store.listKits(), store.directory(), store.getTeams()]);
  const stats = await store.kitStats(kits);
  const people = new Map(dir.map((d) => [d.username, d]));
  const teamName = (id: string | null) => teams.teams.find((t) => t.id === id)?.name ?? "No team";

  // Own: one table. Team: grouped by BD. Everyone: grouped by team.
  const groups = new Map<string, KitRecord[]>();
  for (const k of kits) {
    const key = scope === "own" ? "" : scope === "team" ? (people.get(k.owner)?.fullName ?? k.owner) : teamName(people.get(k.owner)?.team ?? null);
    groups.set(key, [...(groups.get(key) ?? []), k]);
  }
  const counts = (["active", "draft", "paused", "archived"] as const).map((st) => [st, kits.filter((k) => k.status === st).length] as const).filter(([, n]) => n);
  const title = scope === "own" ? "My kits" : scope === "team" ? "Team kits" : "Kits";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <SectionHead
        num="Kits"
        title={title}
        sub={`${counts.map(([st, n]) => `${n} ${st}`).join(" · ") || "Nothing saved yet"}. Each kit is rebuilt from the playbook data when you open it, using the workspace's company details.`}
      />
      {!kits.length ? (
        <div className="space-y-4">
          <p>No saved kits yet.</p>
          <Link href="/console" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Build a kit</Link>
        </div>
      ) : (
        [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, list]) => (
          <section key={group} className="space-y-3">
            {group && <h2 className="text-2xl">{group}</h2>}
            <KitTable kits={list} stats={stats} label={group ? `Kits: ${group}` : "Kits"} />
          </section>
        ))
      )}
    </div>
  );
}

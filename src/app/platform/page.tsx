import type { Metadata } from "next";
import Link from "next/link";
import { AuditTable } from "@/components/admin/AuditTable";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Platform" };

export default async function PlatformHome() {
  const s = await requirePerm("content.approve");
  const store = storeFor(s);
  const [users, ws, audit, approvals, dir, queue] = await Promise.all([store.listUsers(), store.getWorkspace(), store.listAudit(6), store.listApprovals(), store.directory(), store.unassignedQueue()]);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Platform" title={ws.name || "Platform"} sub="Accounts, company details, feature switches, the audit log and content review." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Accounts" value={String(users.length)} note={`${users.filter((u) => u.status === "active").length} active`} />
        <StatTile label="In the queue" value={String(queue.length)} note="Waiting for a BD" />
        <StatTile label="Kits approved" value={String(approvals.filter((a) => a.kind === "category-kit").length)} />
        <StatTile label="Lead finder" value={ws.features.leadFinder ? "On" : "Off"} />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[["/platform/users", "Users", "Create accounts, reset passwords, pause, turn off."], ["/platform/workspace", "Workspace details", "Studio, demo domain and based line used in every kit."],
          ["/platform/content", "Content review", "Approve category kits by file and version."], ["/platform/features", "Feature switches", "Lead finder and IT Prospects."],
          ["/platform/audit", "Audit", "Everything logged, newest first."], ["/admin/teams", "Teams", "Teams and their managers."]].map(([href, title, sub]) => (
          <li key={href}>
            <Link href={href!} className="flex h-full flex-col gap-1 rounded-lg border border-line bg-surface p-5 no-underline hover:border-head">
              <span className="text-xl font-medium text-head">{title}</span><span className="text-muted">{sub}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section className="space-y-3">
        <h2 className="text-2xl">Latest in the audit log</h2>
        <AuditTable entries={audit} names={new Map(dir.map((d) => [d.username, d.fullName]))} />
      </section>
    </div>
  );
}

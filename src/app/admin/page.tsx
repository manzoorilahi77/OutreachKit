import type { Metadata } from "next";
import Link from "next/link";
import { Notices } from "@/components/team/Notices";
import { RequiredReading } from "@/components/team/RequiredReading";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { noticesFrom } from "@/lib/notices";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminHome() {
  const s = await requirePerm("workspace.manage");
  const store = storeFor(s);
  const [users, queue, scopeData, dir, ws, pb, required] = await Promise.all([
    can(s, "users.create") ? store.listUsers() : Promise.resolve([]), store.unassignedQueue(), store.readScope("leads.view"), store.directory(), store.getWorkspace(),
    store.getPlaybook(), store.requiredFor(s.user.username),
  ]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  const notices = noticesFrom(scopeData.events, scopeData.leads, Date.now());
  const active = users.filter((u) => u.status === "active").length;
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Admin" title={ws.name || "Overview"} sub="Accounts, teams and the company details every kit uses." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active accounts" value={String(active)} note={`${users.length - active} paused or off`} />
        <StatTile label="In the queue" value={String(queue.length)} note="Waiting for a BD" />
        <StatTile label="Open leads" value={String(scopeData.leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length)} />
        <StatTile label="Won" value={String(scopeData.leads.filter((l) => l.stage === "won").length)} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5">
        <Link href="/admin/users" className="inline-flex min-h-11 items-center font-medium">Users</Link>
        <Link href="/admin/teams" className="inline-flex min-h-11 items-center">Teams</Link>
        <Link href="/queue" className="inline-flex min-h-11 items-center">Unassigned queue</Link>
        <Link href="/handover" className="inline-flex min-h-11 items-center">Hand over leads</Link>
        <Link href="/admin/settings" className="inline-flex min-h-11 items-center">Settings</Link>
      </div>
      <RequiredReading required={required} reads={pb.reads} />
      <section aria-labelledby="not-h" className="space-y-3">
        <h2 id="not-h" className="text-2xl">Replies and wins</h2>
        <Notices notices={notices} names={names} />
      </section>
    </div>
  );
}

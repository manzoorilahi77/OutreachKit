import type { Metadata } from "next";
import { TeamsForm } from "@/components/admin/TeamsForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Teams" };

export default async function AdminTeams() {
  const s = await requirePerm("workspace.manage");
  const store = storeFor(s);
  const [teams, dir] = await Promise.all([store.getTeams(), store.directory()]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Admin" title="Teams" sub="A team is a manager and the BDs and researchers who report to them. Managers see their team's pipelines and nobody else's. Assign people to a team when you create them or in Users, Move team." />
      <TeamsForm teams={teams.teams.map((t) => ({ id: t.id, name: t.name, managers: t.managers.map((m) => names.get(m) ?? m).join(", ") }))} />
    </div>
  );
}

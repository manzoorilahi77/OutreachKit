import type { Metadata } from "next";
import Link from "next/link";
import { AssignForm, type AssignRow } from "@/components/team/AssignForm";
import { Note } from "@/components/ui/Note";
import { SectionHead } from "@/components/ui/SectionHead";
import { can } from "@/lib/auth/permissions";
import { assignableBds } from "@/lib/auth/assignable";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { stageLabel } from "@/lib/leads/stages";

export const metadata: Metadata = { title: "Unassigned queue" };

export default async function QueuePage() {
  const s = await requirePerm("leads.assign");
  const store = storeFor(s);
  const [queue, bds, dir] = await Promise.all([store.unassignedQueue(), assignableBds(s, store), store.directory()]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  const rows: AssignRow[] = queue.map((l) => ({
    key: `${l.owner}/${l.id}`, business: l.business_name, where: [l.category, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
    stage: stageLabel(l.stage), from: names.get(l.owner) ?? l.owner, score: l.score,
  }));
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Hand-offs" title="Unassigned queue" sub="Leads your researchers have sourced. Give each one to a BD; the BD sees it as “Assigned to you” after the next sync and accepts it." />
      {!rows.length ? <Note tone="quiet"><p>The queue is empty.</p></Note> : !bds.length ? <Note tone="firm"><p>There is no active BD to give leads to yet. Create one in Users.</p></Note> : <AssignForm rows={rows} bds={bds} kind="assign" />}
      {can(s, "leads.handover") && <p>Someone leaving? <Link href="/handover">Hand over their leads</Link>.</p>}
    </div>
  );
}

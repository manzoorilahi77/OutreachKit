import type { Metadata } from "next";
import Link from "next/link";
import { AssignForm, type AssignRow } from "@/components/team/AssignForm";
import { Note } from "@/components/ui/Note";
import { Field, Select } from "@/components/ui/Field";
import { SectionHead } from "@/components/ui/SectionHead";
import { can } from "@/lib/auth/permissions";
import { assignableBds } from "@/lib/auth/assignable";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { stageLabel } from "@/lib/leads/stages";

export const metadata: Metadata = { title: "Hand over leads" };

export default async function HandoverPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const s = await requirePerm("leads.handover");
  const store = storeFor(s);
  const { from } = await searchParams;
  const [bds, dir, leads] = await Promise.all([assignableBds(s, store), store.directory(), store.listLeads()]);
  const scope = s.perms["leads.handover"].scope;
  // Whose leads may be handed over: the BDs in scope, and anyone who has left (their open leads are still in their folder).
  const holders = dir.filter((d) => can(d.role, "leads.add") && (scope === "all" || d.team === s.user.team));
  const source = holders.find((d) => d.username === from);
  const rows: AssignRow[] = source
    ? leads
        .filter((l) => l.owner === source.username && !l.superseded && l.pendingTo === null && l.stage !== "won" && l.stage !== "lost" && (l.heldBy === source.username || l.heldBy === null))
        .map((l) => ({ key: `${l.owner}/${l.id}`, business: l.business_name, where: [l.category, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "), stage: stageLabel(l.stage), from: source.fullName, score: l.score }))
    : [];
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Hand-offs" title="Hand over leads" sub="Pick the person whose leads move, tick the leads and choose the BD who takes them. Each hand-off is a record in your folder; the new owner accepts it after the next sync. Nothing is deleted." />
      <form method="get" className="flex flex-wrap items-end gap-4">
        <div className="w-72">
          <Field id="from" label="Hand over the leads of">
            <Select id="from" name="from" defaultValue={source?.username ?? ""}>
              <option value="">Choose a person</option>
              {holders.map((h) => <option key={h.username} value={h.username}>{h.fullName}{h.status !== "active" ? ` (${h.status})` : ""}</option>)}
            </Select>
          </Field>
        </div>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md border border-head px-4 font-medium text-head hover:bg-head/10">Show their open leads</button>
      </form>
      {source && (!rows.length ? <Note tone="quiet"><p>{source.fullName} has no open leads to hand over.</p></Note> : <AssignForm rows={rows} bds={bds.filter((b) => b.username !== source.username)} kind="handover" />)}
      <p><Link href="/queue">Unassigned queue</Link></p>
    </div>
  );
}

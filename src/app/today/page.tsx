import type { Metadata } from "next";
import Link from "next/link";
import { AcceptButton } from "@/components/team/AcceptButton";
import { RequiredReading } from "@/components/team/RequiredReading";
import { DueText } from "@/components/leads/DueText";
import { Note } from "@/components/ui/Note";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { todayIso } from "@/lib/clock";
import { SEQUENCE } from "@/lib/leads/sequence";
import { stageLabel } from "@/lib/leads/stages";
import { countByStage } from "@/lib/notices";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const s = await requirePerm("kits.save");
  const store = storeFor(s);
  const [mine, incoming, dir, pb, required] = await Promise.all([
    store.listLeads({ mine: true }), store.incoming(), store.directory(), store.getPlaybook(), store.requiredFor(s.user.username),
  ]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  const today = todayIso();
  const open = mine.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const due = open.filter((l) => l.next_action_date !== null && l.next_action_date <= today).sort((a, b) => a.next_action_date!.localeCompare(b.next_action_date!));
  const stages = countByStage(open);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Today" title={`Hello, ${s.user.fullName.split(" ")[0]}`} sub="What is due, what was handed to you, and where to start a new territory." />
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/console" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Build a kit</Link>
        {can(s, "leads.add") && <Link href="/leads/new" className="inline-flex min-h-11 items-center">Add a lead</Link>}
        <Link href="/leads" className="inline-flex min-h-11 items-center">My leads</Link>
      </div>

      <RequiredReading required={required} reads={pb.reads} />

      {incoming.length > 0 && (
        <section aria-labelledby="inc-h" className="space-y-3">
          <h2 id="inc-h" className="text-2xl">Assigned to you</h2>
          <TableWrap label="Leads assigned to you" minWidth={640}>
            <thead><tr>{["Business", "Where", "Stage", "From", ""].map((h, i) => <th key={i} scope="col" className={th}>{h || <span className="sr-only">Accept</span>}</th>)}</tr></thead>
            <tbody>
              {incoming.map((i) => (
                <tr key={i.assignment.id}>
                  <td className={`${td} font-medium`}>{i.lead.business_name}</td>
                  <td className={td}>{[i.lead.category, [i.lead.city, i.lead.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</td>
                  <td className={td}>{stageLabel(i.lead.stage)}</td>
                  <td className={td}>{names.get(i.from) ?? i.from}</td>
                  <td className={td}><AcceptButton id={i.assignment.id} business={i.lead.business_name} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </section>
      )}

      <section aria-labelledby="due-h" className="space-y-3">
        <h2 id="due-h" className="text-2xl">Due next</h2>
        {!due.length ? (
          <Note tone="quiet"><p>Nothing is due. {open.length ? "Your next actions are dated in My leads." : "Add a lead, or build a kit to find businesses."}</p></Note>
        ) : (
          <TableWrap label="Next actions that are due" minWidth={640}>
            <thead><tr>{["Business", "Next step", "Due"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {due.map((l) => (
                <tr key={l.id}>
                  <td className={`${td} font-medium`}><Link href={`/leads/${l.id}`}>{l.business_name}</Link></td>
                  <td className={td}>{l.first_contact_date ? (SEQUENCE[l.sequence_step]?.title ?? "Nurture") : "Contact them"}</td>
                  <td className={td}><DueText date={l.next_action_date} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      <section aria-labelledby="pipe-h" className="space-y-3">
        <h2 id="pipe-h" className="text-2xl">My pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Open leads" value={String(open.length)} />
          <StatTile label="Qualified" value={String(stages.get("qualified") ?? 0)} />
          <StatTile label="Contacted" value={String(stages.get("contacted") ?? 0)} />
          <StatTile label="Replied" value={String(stages.get("replied") ?? 0)} />
          <StatTile label="Call booked" value={String(stages.get("call_booked") ?? 0)} />
        </div>
      </section>
    </div>
  );
}

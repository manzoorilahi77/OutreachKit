import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteLead, updateLead } from "@/app/leads/actions";
import { LeadForm } from "@/components/leads/LeadForm";
import { SequencePanel } from "@/components/leads/SequencePanel";
import { StageControls } from "@/components/leads/StageControls";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DueText } from "@/components/leads/DueText";
import { channelLabel, stageLabel, type Stage } from "@/lib/leads/stages";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSession())) redirect(`/login?next=${encodeURIComponent(`/leads/${id}`)}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();
  const { data: events } = await supabase.from("lead_events").select("*").eq("lead_id", id).order("created_at", { ascending: false });
  const { data: kit } = lead.kit_id ? await supabase.from("kits").select("id,category,city,state").eq("id", lead.kit_id).maybeSingle() : { data: null };

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
      <p><Link href="/leads">← Leads</Link></p>
      <header className="space-y-3">
        <h1 className="text-4xl leading-tight">{lead.business_name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Chip variant={lead.tier}>{lead.tier === "hot" ? "Hot" : lead.tier === "warm" ? "Warm" : "Skip"}</Chip>
          <span className="tabular-nums">{lead.score} / 10</span>
          <Chip variant="plain">{stageLabel(lead.stage as Stage)}</Chip>
          {lead.channel && <span className="text-muted">{channelLabel(lead.channel as never)}</span>}
        </div>
        <p>Next action: <DueText date={lead.next_action_date} /></p>
        {kit && <p className="text-muted">From the kit <Link href={`/kits/${kit.id}`}>{kit.category} in {kit.city}, {kit.state}</Link>.</p>}
      </header>

      <section aria-labelledby="stage-h" className="space-y-3">
        <h2 id="stage-h" className="text-2xl">Pipeline stage</h2>
        <StageControls id={lead.id} stage={lead.stage as Stage} />
      </section>

      <section aria-labelledby="seq-h" className="space-y-3">
        <h2 id="seq-h" className="text-2xl">Contact sequence</h2>
        <SequencePanel id={lead.id} firstContact={lead.first_contact_date} stepsDone={lead.sequence_step} />
      </section>

      <section aria-labelledby="edit-h" className="space-y-4">
        <h2 id="edit-h" className="text-2xl">Details</h2>
        <LeadForm action={updateLead} lead={lead} submitLabel="Save changes" />
      </section>

      <section aria-labelledby="hist-h" className="space-y-3">
        <h2 id="hist-h" className="text-2xl">History</h2>
        {!events?.length ? <p className="text-muted">Nothing yet.</p> : (
          <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {events.map((e) => (
              <li key={e.id} className="grid gap-1 bg-surface p-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                <span className="tabular-nums text-muted">{e.occurred_on}</span>
                <span>
                  {e.kind === "stage_change"
                    ? e.from_stage ? `Moved from ${stageLabel(e.from_stage as Stage)} to ${stageLabel(e.to_stage as Stage)}` : `Added as ${stageLabel(e.to_stage as Stage)}`
                    : `${channelLabel(e.channel as never) || "Touch"}${e.note ? ` · ${e.note}` : ""}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form action={deleteLead} className="border-t border-line pt-6">
        <input type="hidden" name="id" value={lead.id} />
        <Button variant="secondary" type="submit">Delete this lead</Button>
      </form>
    </div>
  );
}

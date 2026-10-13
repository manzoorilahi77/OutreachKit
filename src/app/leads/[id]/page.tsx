import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLead, updateLead } from "@/app/leads/actions";
import { CommentForm } from "@/components/leads/CommentForm";
import { DueText } from "@/components/leads/DueText";
import { LeadForm } from "@/components/leads/LeadForm";
import { SequencePanel } from "@/components/leads/SequencePanel";
import { StageControls } from "@/components/leads/StageControls";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { sizeOfCategory } from "@/lib/kit/categories";
import { SIZE_LABEL } from "@/lib/kit/extBoard";
import { COUNTRIES, countryOf } from "@/lib/market/regions";
import { can, limitOf } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { CHECK_LABELS } from "@/lib/leads/checks";
import { channelLabel, stageLabel, STAGES, type Stage } from "@/lib/leads/stages";
import { isId } from "@/lib/store/paths";

export const metadata: Metadata = { title: "Lead" };

const FIELDS: [label: string, key: string][] = [
  ["Owner first name", "owner_first_name"], ["Phone", "phone"], ["Email", "email"], ["Instagram", "instagram_handle"], ["Facebook", "facebook_page"],
  ["Google Maps", "google_maps_url"], ["Website", "website_url"], ["Site verdict", "site_verdict"], ["Google reviews", "google_review_count"],
  ["Google rating", "google_rating"], ["Followers", "followers"], ["Last post", "last_post_date"], ["Demo", "demo_url"], ["First contact", "first_contact_date"],
];

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requirePerm("leads.view");
  if (!isId(id)) notFound();
  const store = storeFor(s);
  const [all, dir] = await Promise.all([store.listLeads(), store.directory()]);
  const lead = all.find((l) => l.id === id);
  if (!lead) notFound();
  const names = new Map(dir.map((d) => [d.username, d.firstName]));
  const nameOf = (u: string) => (u === s.user.username ? "You" : (names.get(u) ?? u));
  const mine = lead.owner === s.user.username;
  const canEdit = mine && can(s, "leads.edit");
  const capped = limitOf(s, "leads.edit") === "to_qualified";
  const events = await store.leadEvents(lead.owner, lead.id);
  const kit = lead.kit_id ? await store.getKit(lead.owner, lead.kit_id) : null;
  const allowedStages = capped ? STAGES.filter((x) => x.value === "sourced" || x.value === "qualified").map((x) => x.value) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
      <p><Link href="/leads">← Leads</Link></p>
      <header className="space-y-3">
        <h1 className="text-4xl leading-tight">{lead.business_name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Chip variant={lead.tier}>{lead.tier === "hot" ? "Hot" : lead.tier === "warm" ? "Warm" : "Skip"}</Chip>
          <span className="tabular-nums">{lead.score} / 10</span>
          <Chip variant="plain">{stageLabel(lead.stage as Stage)}</Chip>
          {sizeOfCategory(lead.category ?? "") && <Chip variant={sizeOfCategory(lead.category ?? "") === "mid" ? "warm" : "plain"}>{SIZE_LABEL[sizeOfCategory(lead.category ?? "")!]}</Chip>}
          {lead.state && countryOf(lead.state.toUpperCase()) !== "US" && <Chip>{COUNTRIES[countryOf(lead.state.toUpperCase())].short}</Chip>}
          {lead.channel && <span className="text-muted">{channelLabel(lead.channel)}</span>}
          {lead.heldBy !== null && lead.heldBy !== lead.owner && <Chip>{lead.pendingTo ? `With ${nameOf(lead.heldBy)}, not accepted yet` : `Now ${nameOf(lead.heldBy)}'s lead`}</Chip>}
          {lead.heldBy === null && <Chip>Unassigned</Chip>}
          {!mine && <Chip>{nameOf(lead.owner)}&apos;s lead</Chip>}
        </div>
        <p>Next action: <DueText date={lead.next_action_date} /></p>
        {kit && <p className="text-muted">From the kit <Link href={`/kits/${kit.id}`}>{kit.title}</Link>.</p>}
        {lead.sourceRef && <p className="text-muted">Accepted from {nameOf(lead.sourceRef.owner)}.</p>}
      </header>

      {canEdit ? (
        <>
          <section aria-labelledby="stage-h" className="space-y-3">
            <h2 id="stage-h" className="text-2xl">Pipeline stage</h2>
            <StageControls id={lead.id} stage={lead.stage as Stage} allowed={allowedStages} />
            {capped && <p className="text-muted">You take a lead up to Qualified. A manager gives it to a BD from there.</p>}
          </section>

          {!capped && (
            <section aria-labelledby="seq-h" className="space-y-3">
              <h2 id="seq-h" className="text-2xl">Contact sequence</h2>
              <SequencePanel id={lead.id} firstContact={lead.first_contact_date} stepsDone={lead.sequence_step} />
            </section>
          )}

          <section aria-labelledby="edit-h" className="space-y-4">
            <h2 id="edit-h" className="text-2xl">Details</h2>
            <LeadForm action={updateLead} lead={lead} submitLabel="Save changes" restricted={capped} />
          </section>
        </>
      ) : (
        <section aria-labelledby="det-h" className="space-y-4">
          <h2 id="det-h" className="text-2xl">Details</h2>
          <p className="text-muted">Read-only. Only {nameOf(lead.owner)} edits this lead.</p>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {[["Category", lead.category], ["Where", [lead.city, lead.state].filter(Boolean).join(", ")], ...FIELDS.map(([l, k]) => [l, String((lead as unknown as Record<string, unknown>)[k] ?? "")])]
              .filter(([, v]) => v)
              .map(([l, v]) => <div key={l}><dt className="text-sm text-muted">{l}</dt><dd className="break-words">{v}</dd></div>)}
          </dl>
          <p className="text-sm text-muted">Checks ticked: {CHECK_LABELS.filter((c) => lead[c.field]).map((c) => c.label).join("; ") || "none"}.</p>
          {lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
        </section>
      )}

      <section aria-labelledby="hist-h" className="space-y-3">
        <h2 id="hist-h" className="text-2xl">History</h2>
        {!events.length ? <p className="text-muted">Nothing yet.</p> : (
          <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {events.map((e) => (
              <li key={e.id} className="grid gap-1 bg-surface p-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                <span className="tabular-nums text-muted">{e.occurred_on}</span>
                <span>
                  {e.kind === "stage_change"
                    ? e.from_stage ? `Moved from ${stageLabel(e.from_stage)} to ${stageLabel(e.to_stage as Stage)}` : `Added as ${stageLabel(e.to_stage as Stage)}${e.note ? ` · ${e.note}` : ""}`
                    : e.kind === "comment"
                      ? <><strong>{nameOf(e.by)}:</strong> {e.note}</>
                      : `${channelLabel(e.channel as never) || "Touch"}${e.note ? ` · ${e.note}` : ""}`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {can(s, "leads.comment") && (
        <section aria-labelledby="com-h" className="space-y-3">
          <h2 id="com-h" className="text-2xl">Comments</h2>
          <p className="text-muted">{mine ? "A note for yourself, shown in the history." : `Shown in the history on ${nameOf(lead.owner)}'s lead.`}</p>
          <CommentForm owner={lead.owner} id={lead.id} />
        </section>
      )}

      {canEdit && (
        <form action={deleteLead} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={lead.id} />
          <Button variant="secondary" type="submit">Delete this lead</Button>
        </form>
      )}
    </div>
  );
}

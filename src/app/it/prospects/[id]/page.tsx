import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProspectAction, deleteSignalAction, updateProspectAction } from "@/app/it/actions";
import { PageHead } from "@/components/it/PageHead";
import { ProspectForm } from "@/components/it/ProspectForm";
import { AssignForm, ItCommentForm, ItStageControls, QualifierForm, SignalForm } from "@/components/it/ProspectControls";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { can } from "@/lib/auth/permissions";
import { todayIso } from "@/lib/clock";
import { daysSince, isFresh, itStageLabel, QUALIFIER, segmentInfo, signalInfo, TIER_LABEL, type ItEvent } from "@/lib/it/model";
import { requireIt } from "@/lib/it/server";
import { whatsappHref } from "@/lib/leads/whatsapp";
import { COUNTRIES } from "@/lib/market/regions";
import { isId } from "@/lib/store/paths";

export const metadata: Metadata = { title: "IT prospect" };

const ext = (href: string, label: string) => <a href={href} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> (opens in a new tab)</span></a>;

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { s, store, on } = await requireIt("it.view");
  if (!on) return null;
  if (!isId(id)) notFound();
  const it = store.it();
  const p = await it.getProspect(id);
  if (!p) notFound();
  const today = todayIso();
  const me = s.user.username;
  const [events, dir, people] = await Promise.all([it.events(id), store.directory(), can(s, "it.assign") ? it.assignable() : Promise.resolve([])]);
  const names = new Map(dir.map((d) => [d.username, d.firstName]));
  const nameOf = (u: string) => (u === me ? "You" : (names.get(u) ?? u));
  const canEdit = can(s, "it.edit") && (p.owner === me || p.assignee === me);
  const canAssign = can(s, "it.assign") && people.length > 0;
  const where = [p.city, p.region, COUNTRIES[p.country].name].filter(Boolean).join(", ");
  const describe = (e: ItEvent) =>
    e.kind === "created" ? `Added${e.note ? ` · ${e.note}` : ""}`
    : e.kind === "stage" ? `Moved from ${itStageLabel(e.fromStage!)} to ${itStageLabel(e.toStage!)}`
    : e.kind === "assign" ? (e.note ? `Assigned to ${nameOf(e.note)}` : "Assignment cleared")
    : e.kind === "signal" ? `Signal added: ${signalInfo(e.note as never)?.label ?? e.note}`
    : e.note;

  return (
    <div className="space-y-10">
      <p><Link href="/it/prospects">← Prospects</Link></p>
      <PageHead title={p.company}>
        <div className="flex flex-wrap items-center gap-3">
          <Chip variant={p.tier}>{TIER_LABEL[p.tier]}</Chip>
          <span className="tabular-nums">{p.score} / 6</span>
          <Chip>{itStageLabel(p.stage)}</Chip>
          <Chip>{segmentInfo(p.segment).label}</Chip>
          {p.signalState === "stale" && <Chip variant="skip">Signal gone stale</Chip>}
          {p.owner !== me && <Chip>{nameOf(p.owner)}&apos;s prospect</Chip>}
          {p.assignee && <Chip>{p.assignee === me ? "Assigned to you" : `With ${nameOf(p.assignee)}`}</Chip>}
        </div>
        <p className="text-muted">What we offer: {segmentInfo(p.segment).sell}</p>
      </PageHead>

      <section aria-labelledby="sig-h" className="space-y-4">
        <h2 id="sig-h" className="text-2xl">Buying signals</h2>
        {!p.signals.length ? <p className="text-muted">No signal yet. A dated reason to write, such as an open role or a tender, makes the first message easy.</p> : (
          <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {p.signals.map((sg) => {
              const age = daysSince(sg.signalDate, today);
              return (
                <li key={sg.id} className="space-y-2 bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{signalInfo(sg.type).label}</span>
                    <Chip variant={isFresh(sg.type, sg.signalDate, today) ? "warm" : "skip"}>{isFresh(sg.type, sg.signalDate, today) ? "Fresh" : "Stale"}</Chip>
                    <span className="text-muted">{sg.signalDate ? `${sg.signalDate} · ${age} days ago` : "No date"}{sg.source ? ` · ${sg.source}` : ""}</span>
                  </div>
                  {sg.quote && <blockquote className="border-l-4 border-line pl-3">{sg.quote}</blockquote>}
                  <div className="flex flex-wrap items-center gap-4">
                    {sg.url && ext(sg.url, "Open the post")}
                    {canEdit && (
                      <form action={deleteSignalAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="signalId" value={sg.id} />
                        <Button type="submit" variant="ghost">Remove this signal</Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {canEdit && can(s, "it.add") && (
          <details className="rounded-lg border border-line p-4">
            <summary className="min-h-11 cursor-pointer text-head">Add a signal</summary>
            <div className="pt-4"><SignalForm id={p.id} today={today} /></div>
          </details>
        )}
      </section>

      {canEdit ? (
        <>
          <section aria-labelledby="stage-h" className="space-y-3">
            <h2 id="stage-h" className="text-2xl">Pipeline stage</h2>
            <ItStageControls id={p.id} stage={p.stage} />
          </section>
          <section aria-labelledby="q-h" className="space-y-3">
            <h2 id="q-h" className="text-2xl">Qualifier</h2>
            <p className="text-muted">The Reset&apos;s six questions about this company. 5–6 is hot, 3–4 warm, 0–2 skip.</p>
            <QualifierForm id={p.id} qualifier={p.qualifier} freshSignal={p.signalState === "fresh"} />
          </section>
        </>
      ) : (
        <section aria-labelledby="q-h" className="space-y-2">
          <h2 id="q-h" className="text-2xl">Qualifier</h2>
          <p>Ticked: {QUALIFIER.filter((q) => p.qualifier[q.key] || (q.key === "trigger" && p.signalState === "fresh")).map((q) => q.label).join("; ") || "none"}.</p>
        </section>
      )}

      {canAssign && (
        <section aria-labelledby="as-h" className="space-y-3">
          <h2 id="as-h" className="text-2xl">Who works it</h2>
          <p className="text-muted">The owner keeps the prospect. The person it&apos;s assigned to can work it too.</p>
          <AssignForm id={p.id} current={p.assignee} people={people} />
        </section>
      )}

      <section aria-labelledby="det-h" className="space-y-4">
        <h2 id="det-h" className="text-2xl">Details</h2>
        {canEdit ? <ProspectForm action={updateProspectAction} prospect={p} submitLabel="Save changes" today={today} /> : (
          <>
            <p className="text-muted">Read-only. Only {nameOf(p.owner)}{p.assignee ? ` or ${nameOf(p.assignee)}` : ""} edits this prospect.</p>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {([
                ["Website", p.websiteUrl ? ext(p.websiteUrl, p.websiteUrl) : ""], ["Domain", p.companyDomain], ["LinkedIn", p.linkedinUrl ? ext(p.linkedinUrl, "Company page") : ""],
                ["Contact", [p.contactName, p.contactTitle].filter(Boolean).join(", ")], ["Email", p.email], ["Phone", p.phone],
                ["WhatsApp", p.whatsapp ? ext(whatsappHref(p.whatsapp) || "#", p.whatsapp) : ""], ["Where", where], ["Team size", p.teamSize],
                ["Google Maps", p.mapsUrl ? ext(p.mapsUrl, p.mapsCategory || "Listing") : ""],
              ] as [string, React.ReactNode][]).filter(([, v]) => v).map(([l, v]) => <div key={l}><dt className="text-sm text-muted">{l}</dt><dd className="break-words">{v}</dd></div>)}
            </dl>
            {p.notes && <p className="whitespace-pre-wrap">{p.notes}</p>}
          </>
        )}
      </section>

      <section aria-labelledby="hist-h" className="space-y-3">
        <h2 id="hist-h" className="text-2xl">History</h2>
        {!events.length ? <p className="text-muted">Nothing yet.</p> : (
          <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {events.map((e) => (
              <li key={e.id} className="grid gap-1 bg-surface p-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <span className="tabular-nums text-muted">{e.createdAt.slice(0, 10)}</span>
                <span>{e.kind === "comment" ? <><strong>{nameOf(e.by)}:</strong> {e.note}</> : <>{describe(e)} <span className="text-muted">· {nameOf(e.by)}</span></>}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {can(s, "it.comment") && (
        <section aria-labelledby="com-h" className="space-y-3">
          <h2 id="com-h" className="text-2xl">Comments</h2>
          <ItCommentForm id={p.id} />
        </section>
      )}

      {canEdit && p.owner === me && (
        <form action={deleteProspectAction} className="border-t border-line pt-6">
          <input type="hidden" name="id" value={p.id} />
          <Button variant="secondary" type="submit">Delete this prospect</Button>
        </form>
      )}
    </div>
  );
}

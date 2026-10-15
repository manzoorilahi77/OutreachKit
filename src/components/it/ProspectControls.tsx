"use client";

import { useActionState, useState, useTransition } from "react";
import { addSignalAction, assignProspectAction, itCommentAction, moveItStageAction, setQualifierAction } from "@/app/it/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { IT_STAGES, QUALIFIER, SIGNAL_TYPES, type ItStage, type Qualifier } from "@/lib/it/model";
import { FormMessage } from "./FormMessage";

const area = "w-full rounded-md border border-fg/60 bg-bg px-3 py-2 text-base text-fg";

export function ItStageControls({ id, stage }: { id: string; stage: ItStage }) {
  const [to, setTo] = useState<ItStage>(stage);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48">
          <label htmlFor="it-stage" className="field-label mb-1 block text-base">Stage</label>
          <Select id="it-stage" value={to} onChange={(e) => setTo(e.target.value as ItStage)}>
            {IT_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <Button variant="secondary" disabled={pending || to === stage} onClick={() => start(async () => setMsg(await moveItStageAction(id, to)))}>Move</Button>
      </div>
      <FormMessage state={msg} />
    </div>
  );
}

export function QualifierForm({ id, qualifier, freshSignal }: { id: string; qualifier: Qualifier; freshSignal: boolean }) {
  const [state, run, pending] = useActionState(setQualifierAction, null);
  return (
    <form action={run} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <ul className="grid gap-3 md:grid-cols-2">
        {QUALIFIER.map((q) => (
          <li key={q.key}>
            <label className="flex items-start gap-3 rounded-md border border-line p-3">
              <input type="checkbox" name={q.key} defaultChecked={qualifier[q.key]} className="mt-1 size-6 shrink-0 accent-head" />
              <span>
                <span className="block font-medium">{q.label}</span>
                <span className="block text-sm text-muted">{q.key === "trigger" && freshSignal ? "Counted already: this prospect has a fresh signal." : q.hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save the qualifier"}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function SignalForm({ id, today }: { id: string; today: string }) {
  const [state, run, pending] = useActionState(async (p: Parameters<typeof addSignalAction>[0], fd: FormData) => {
    const r = await addSignalAction(p, fd);
    if (r?.ok) (document.getElementById("sf-form") as HTMLFormElement | null)?.reset();
    return r;
  }, null);
  return (
    <form id="sf-form" action={run} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="sf-type" label="Kind of signal">
          <Select id="sf-type" name="signalType" defaultValue="dev_role">{SIGNAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
        </Field>
        <Field id="sf-date" label="Posted on"><Input id="sf-date" name="signalDate" type="date" max={today} /></Field>
        <Field id="sf-url" label="Link to the post"><Input id="sf-url" name="signalUrl" inputMode="url" /></Field>
        <Field id="sf-source" label="Where you saw it"><Input id="sf-source" name="signalSource" maxLength={40} /></Field>
      </div>
      <Field id="sf-quote" label="A short quote from it"><textarea id="sf-quote" name="signalQuote" rows={2} maxLength={2000} className={area} /></Field>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Add the signal"}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function AssignForm({ id, current, people }: { id: string; current: string | null; people: { username: string; fullName: string }[] }) {
  const [state, run, pending] = useActionState(assignProspectAction, null);
  return (
    <form action={run} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="min-w-60">
        <Field id="as-to" label="Assigned to">
          <Select id="as-to" name="to" defaultValue={current ?? ""}>
            <option value="">Nobody (the owner works it)</option>
            {people.map((p) => <option key={p.username} value={p.username}>{p.fullName}</option>)}
          </Select>
        </Field>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Assign"}</Button>
      <FormMessage state={state} />
    </form>
  );
}

export function ItCommentForm({ id }: { id: string }) {
  const [state, run, pending] = useActionState(async (p: Parameters<typeof itCommentAction>[0], fd: FormData) => {
    const r = await itCommentAction(p, fd);
    if (r?.ok) (document.getElementById("it-comment") as HTMLTextAreaElement | null)?.form?.reset();
    return r;
  }, null);
  return (
    <form action={run} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="it-comment" className="field-label block text-base">Add a comment</label>
      <textarea id="it-comment" name="note" rows={3} required maxLength={1000} className={area} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Comment"}</Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

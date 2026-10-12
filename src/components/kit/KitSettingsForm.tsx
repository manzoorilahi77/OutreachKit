"use client";

import { useActionState } from "react";
import { updateKit, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { KIT_STATUS_LABEL } from "@/lib/store/kitText";
import { KIT_STATUSES, type KitStatus } from "@/lib/store/types";

export function KitSettingsForm({ id, title, status }: { id: string; title: string; status: KitStatus }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateKit, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="kit-title" label="Title"><Input id="kit-title" name="title" defaultValue={title} required maxLength={160} autoComplete="off" /></Field>
        <Field id="kit-status" label="Status" hint="Archive a kit to take it out of the lists without losing its leads.">
          <Select id="kit-status" name="status" defaultValue={status}>{KIT_STATUSES.map((s) => <option key={s} value={s}>{KIT_STATUS_LABEL[s]}</option>)}</Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
        {state && (
          <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span></p>
        )}
      </div>
    </form>
  );
}

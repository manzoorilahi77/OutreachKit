"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { setRequiredAction } from "@/app/playbook/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function RequiredForm({ sections, required, who }: { sections: { id: string; num: string; title: string }[]; required: string[]; who: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setRequiredAction, null);
  return (
    <form action={action} className="space-y-4">
      <p className="text-muted">Required for {who}. It appears as a checklist on their home page until they have read it.</p>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {sections.map((s) => (
          <li key={s.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 p-3">
              <input type="checkbox" name="section" value={s.id} defaultChecked={required.includes(s.id)} className="size-6 shrink-0 accent-head" />
              <span>{s.num} · {s.title}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save required sections"}</Button>
        {state && <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span></p>}
      </div>
    </form>
  );
}

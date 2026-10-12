"use client";

import { useActionState, useState } from "react";
import { saveTeamsAction, type AccountState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function TeamsForm({ teams }: { teams: { id: string; name: string; managers: string }[] }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveTeamsAction, null);
  const [rows, setRows] = useState(teams);
  return (
    <form action={action} className="space-y-4">
      <ul className="space-y-3">
        {rows.map((t, i) => (
          <li key={t.id || `new-${i}`} className="grid items-end gap-3 sm:grid-cols-[1fr_16rem]">
            <input type="hidden" name="id" value={t.id} />
            <Field id={`team-${i}`} label={t.id ? `Team name (${t.id})` : "New team name"}>
              <Input id={`team-${i}`} name="name" defaultValue={t.name} required autoComplete="off" />
            </Field>
            <p className="pb-3 text-muted">{t.managers ? `Managed by ${t.managers}` : "No manager yet"}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setRows((r) => [...r, { id: "", name: "", managers: "" }])}>Add a team</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save teams"}</Button>
        {state && <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span></p>}
      </div>
    </form>
  );
}

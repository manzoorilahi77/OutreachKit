"use client";

import { useActionState } from "react";
import { saveWorkspaceAction, type AccountState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function WorkspaceForm({ ws }: { ws: { name: string; studio: string; demoDomain: string; basedLine: string } }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveWorkspaceAction, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="ws-name" label="Workspace name"><Input id="ws-name" name="name" defaultValue={ws.name} required autoComplete="off" /></Field>
        <Field id="ws-studio" label="Studio or brand" hint="Used as “your brand” in every kit."><Input id="ws-studio" name="studio" defaultValue={ws.studio} placeholder="e.g. Famysys" autoComplete="off" /></Field>
        <Field id="ws-domain" label="Demo domain" hint="Every sample site gets its own address under this domain."><Input id="ws-domain" name="demoDomain" defaultValue={ws.demoDomain} placeholder="yourstudio.com" autoComplete="off" /></Field>
        <Field id="ws-based" label="Based line" hint="A short line about where you are based, shown on each kit workspace."><Input id="ws-based" name="basedLine" defaultValue={ws.basedLine} autoComplete="off" /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button>
        {state && <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span></p>}
      </div>
    </form>
  );
}

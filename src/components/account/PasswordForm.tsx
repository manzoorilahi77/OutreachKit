"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function PasswordForm({ askCurrent }: { askCurrent: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      {askCurrent && (
        <Field id="current" label="Current password">
          <Input id="current" name="current" type="password" required autoComplete="current-password" />
        </Field>
      )}
      <Field id="new" label="New password" hint="At least 10 characters.">
        <Input id="new" name="new" type="password" required minLength={10} autoComplete="new-password" />
      </Field>
      <Field id="confirm" label="New password again">
        <Input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Set my password"}</Button>
      {state && (
        <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AlertIcon } from "@/components/ui/Icons";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field id="username" label="Username">
        <Input id="username" name="username" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      {state && !state.ok && (
        <p className="flex items-start gap-2" role="alert"><AlertIcon className="mt-1 shrink-0" /><span>{state.message}</span></p>
      )}
    </form>
  );
}

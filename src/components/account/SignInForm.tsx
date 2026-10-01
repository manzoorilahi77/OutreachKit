"use client";

import { useActionState } from "react";
import { requestSignIn, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function SignInForm({ next, expired }: { next: string; expired: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestSignIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {expired && !state && (
        <p className="flex items-start gap-2" role="alert"><AlertIcon className="mt-1 shrink-0" /> That link has expired or was already used. Ask for a new one.</p>
      )}
      <Field id="email" label="Your email" hint="We email you a link. There is no password to remember.">
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@yourstudio.com" />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</Button>
      {state && (
        <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function ProfileForm({ defaultDevice }: { defaultDevice: "desktop" | "mobile" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="max-w-sm">
        <Field id="default_device" label="Where you usually work" hint="The Kit Console starts on this choice.">
          <Select id="default_device" name="default_device" defaultValue={defaultDevice}>
            <option value="desktop">Desktop</option>
            <option value="mobile">Phone</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      {state && (
        <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}

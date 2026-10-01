"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function ProfileForm({ profile }: { profile: { name: string; studio: string; demo_domain: string; default_device: "desktop" | "mobile" } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="name" label="Your name" hint="Used in the messages.">
          <Input id="name" name="name" defaultValue={profile.name} placeholder="e.g. Manzoor" autoComplete="off" />
        </Field>
        <Field id="studio" label="Your studio or brand">
          <Input id="studio" name="studio" defaultValue={profile.studio} placeholder="e.g. Famysys" autoComplete="off" />
        </Field>
        <Field id="demo_domain" label="Your demo domain" hint="Every sample site gets its own address under this domain.">
          <Input id="demo_domain" name="demo_domain" defaultValue={profile.demo_domain} placeholder="yourstudio.com" autoComplete="off" />
        </Field>
        <Field id="default_device" label="Where you usually work" hint="The console starts on this choice.">
          <Select id="default_device" name="default_device" defaultValue={profile.default_device}>
            <option value="desktop">Desktop</option>
            <option value="mobile">Phone</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save details"}</Button>
      {state && (
        <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
    </form>
  );
}

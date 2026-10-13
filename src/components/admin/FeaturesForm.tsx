"use client";

import { useActionState } from "react";
import { saveFeaturesAction, type AccountState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";

export function FeaturesForm({ leadFinder, softwareTrack }: { leadFinder: boolean; softwareTrack: boolean }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveFeaturesAction, null);
  return (
    <form action={action} className="space-y-4">
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        <li>
          <label className="flex min-h-11 cursor-pointer gap-3 p-4">
            <input type="checkbox" name="leadFinder" defaultChecked={leadFinder} className="mt-1 size-6 shrink-0 accent-head" />
            <span><strong className="block">Lead finder</strong><span className="block text-muted">Lets people with the role run the Google Maps finder from the console and the Lead finder page. The server also needs Chromium installed.</span></span>
          </label>
        </li>
        <li>
          <label className="flex min-h-11 cursor-pointer gap-3 p-4">
            <input type="checkbox" name="softwareTrack" defaultChecked={softwareTrack} className="mt-1 size-6 shrink-0 accent-head" />
            <span><strong className="block">Software track</strong><span className="block text-muted">Turns on the software track (Phase 12) for the whole workspace once it is built.</span></span>
          </label>
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save switches"}</Button>
        {state && <p className="flex items-center gap-2" role={state.ok ? "status" : "alert"}>{state.ok ? <CheckIcon /> : <AlertIcon />}<span>{state.message}</span></p>}
      </div>
    </form>
  );
}

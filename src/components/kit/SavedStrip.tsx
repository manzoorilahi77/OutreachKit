"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { saveKit, type SaveKitResult } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import type { KitInput } from "@/lib/kit/types";
import type { DirectionId } from "@/lib/kit-v2/types";
import { KIT_STATUS_LABEL } from "@/lib/store/kitText";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Replaces the old Save button, through the console's actions slot. Before saving: one button. After: the saved strip with the
 * kit's title and status, its counters, who else works the same category and city, and three next actions.
 * Territories are shared, so saving never blocks; the duplicate block happens on the business itself.
 */
export function SavedStrip({ input, direction = "b", finderEnabled }: { input: KitInput; direction?: DirectionId; finderEnabled: boolean }) {
  const [result, setResult] = useState<SaveKitResult | null>(null);
  const [synced, setSynced] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!result?.ok) return;
    let live = true;
    fetch("/api/sync", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { pending?: number } | null) => live && setSynced(!!j && j.pending === 0))
      .catch(() => {});
    return () => { live = false; };
  }, [result]);

  if (!result?.ok) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => start(async () => setResult(await saveKit({ category: input.cat, device: input.device, state: input.st, city: input.city, direction })))}
        >
          {pending ? "Saving…" : "Save this kit"}
        </Button>
        {result && !result.ok && <span className="flex items-center gap-2" role="alert"><AlertIcon /> {result.error}</span>}
      </div>
    );
  }

  const { kit, stats, others, team } = result;
  const where = `${input.cat} in ${input.city}, ${input.st}`;
  return (
    <section aria-label="Saved kit" className="w-full space-y-4 rounded-lg border-2 border-head bg-surface p-4">
      <p className="flex items-center gap-2 text-sm text-muted" role="status"><CheckIcon /> Saved · syncs with your team</p>
      <h4 className="text-2xl">{kit.title}</h4>
      <div className="flex flex-wrap gap-2">
        <Chip variant={kit.status === "active" ? "tier-a" : "plain"}>{KIT_STATUS_LABEL[kit.status]}</Chip>
        {team && <Chip>{team}</Chip>}
        <Chip>{synced ? "Synced" : "Not synced yet"}</Chip>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {([["Leads", stats.leads], ["Contacted", stats.contacted], ["Replied", stats.replied]] as const).map(([label, n]) => (
          <div key={label} className="rounded-md border border-line bg-bg p-3">
            <dd className="text-3xl leading-tight tabular-nums">{n}</dd>
            <dt className="text-sm text-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <p>
        {others.length
          ? <>Also working {where}: {others.map((o) => `${o.name} (${plural(o.leads, "lead", "leads")})`).join(", ")}. </>
          : <>Nobody else has saved {where} yet. </>}
        Duplicate businesses are blocked.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link href={`/leads/new?kit=${kit.id}`} className="inline-flex min-h-11 items-center font-medium">{stats.leads ? "Add a lead" : "Add the first lead"}</Link>
        {finderEnabled && (
          <button type="button" className="inline-flex min-h-11 items-center font-medium text-head underline underline-offset-4" onClick={() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth" })}>
            Find businesses
          </button>
        )}
        <Link href={`/kits/${kit.id}`} className="inline-flex min-h-11 items-center font-medium">Open the kit workspace</Link>
      </div>
    </section>
  );
}

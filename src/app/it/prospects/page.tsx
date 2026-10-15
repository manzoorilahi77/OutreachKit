import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/it/PageHead";
import { ProspectsTable, type ProspectFilters } from "@/components/it/ProspectsTable";
import { can } from "@/lib/auth/permissions";
import { todayIso } from "@/lib/clock";
import { requireIt } from "@/lib/it/server";

export const metadata: Metadata = { title: "IT prospects" };

const KEYS: (keyof ProspectFilters)[] = ["segment", "stage", "signal", "type", "country", "tier", "who", "q"];

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { s, store, on } = await requireIt("it.view");
  if (!on) return null;
  const sp = await searchParams;
  const initial = Object.fromEntries(KEYS.map((k) => [k, typeof sp[k] === "string" ? sp[k] : ""])) as unknown as ProspectFilters;
  const [rows, dir] = await Promise.all([store.it().listProspects(), store.directory()]);
  const names = Object.fromEntries(dir.map((d) => [d.username, d.firstName]));
  return (
    <div className="space-y-6">
      <PageHead title="Prospects" sub="Every IT prospect you can see. The score is the Reset's six questions; a fresh signal counts as the trigger.">
        <div className="flex flex-wrap gap-3 pt-2">
          {can(s, "it.add") && <Link href="/it/prospects/new" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Add a prospect</Link>}
          {can(s, "it.add") && <Link href="/it/signals#import" className="inline-flex min-h-11 items-center">Import a CSV</Link>}
          {can(s, "it.export") && <a href="/it/export.csv" className="inline-flex min-h-11 items-center">Export CSV</a>}
        </div>
      </PageHead>
      <ProspectsTable rows={rows} names={names} me={s.user.username} initial={initial} showWho={s.perms["it.view"].scope !== "own"} today={todayIso()} />
    </div>
  );
}

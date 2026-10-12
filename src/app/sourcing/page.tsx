import type { Metadata } from "next";
import Link from "next/link";
import { RequiredReading } from "@/components/team/RequiredReading";
import { Note } from "@/components/ui/Note";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { localDay } from "@/lib/scrape/limits";

export const metadata: Metadata = { title: "Sourcing" };

export default async function SourcingPage() {
  const s = await requirePerm("finder.run");
  const store = storeFor(s);
  const [mine, ws, pb, required, dir] = await Promise.all([store.listLeads({ mine: true }), store.getWorkspace(), store.getPlaybook(), store.requiredFor(s.user.username), store.directory()]);
  const names = new Map(dir.map((d) => [d.username, d.firstName]));
  const finderOn = ws.features.leadFinder;
  const savedToday = finderOn ? await store.finder().countSavedOn(localDay()) : 0;
  const waiting = mine.filter((l) => l.heldBy === null);
  const withBd = mine.filter((l) => l.heldBy !== null && l.heldBy !== s.user.username);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Sourcing" title={`Hello, ${s.user.fullName.split(" ")[0]}`} sub="Find businesses, fill in the columns, run the 30-second scorer. Your leads wait in the queue until a manager gives them to a BD." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Sourced by you" value={String(mine.length)} />
        <StatTile label="Waiting in the queue" value={String(waiting.length)} />
        <StatTile label="With a BD" value={String(withBd.length)} />
        <StatTile label="Found today" value={finderOn ? String(savedToday) : "Off"} note={finderOn ? undefined : "Lead finder is off"} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {finderOn && <Link href="/sourcing/finder" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Open the lead finder</Link>}
        {can(s, "leads.add") && <Link href="/leads/new" className="inline-flex min-h-11 items-center">Add a lead</Link>}
        <Link href="/leads" className="inline-flex min-h-11 items-center">My sourced leads</Link>
      </div>
      <RequiredReading required={required} reads={pb.reads} />
      {withBd.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl">With a BD</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {withBd.slice(0, 10).map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 bg-surface p-3">
                <Link href={`/leads/${l.id}`}>{l.business_name}</Link>
                <span className="text-muted">With {names.get(l.heldBy!) ?? l.heldBy}{l.pendingTo ? ", not accepted yet" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Note tone="quiet"><p>You never contact anyone. A lead you take to Qualified goes to a BD through your manager.</p></Note>
    </div>
  );
}

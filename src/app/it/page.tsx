import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/it/PageHead";
import { Chip } from "@/components/ui/Chip";
import { StatTile } from "@/components/ui/StatTile";
import { can } from "@/lib/auth/permissions";
import { IT_STAGES, OPEN_IT_STAGES, SEGMENTS, itStageLabel, segmentInfo, signalInfo, TIER_LABEL } from "@/lib/it/model";
import { requireIt } from "@/lib/it/server";

export const metadata: Metadata = { title: "IT Prospects" };

export default async function ItOverview() {
  const { s, store, on } = await requireIt("it.view");
  if (!on) return null;
  const all = await store.it().listProspects();
  const open = all.filter((p) => OPEN_IT_STAGES.includes(p.stage));
  const fresh = open.filter((p) => p.signalState === "fresh");
  const stale = open.filter((p) => p.signalState === "stale");
  const hot = open.filter((p) => p.tier === "hot");
  const mine = all.filter((p) => p.owner === s.user.username || p.assignee === s.user.username);
  const scope = s.perms["it.view"].scope;
  const newest = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <div className="space-y-10">
      <PageHead
        title="Overview"
        sub="Companies that pay for software work: open developer roles, project posts and tenders; digital agencies and IT firms that need white-label capacity; and businesses with a visible IT need. Kept apart from the local leads."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label={scope === "own" ? "Your open prospects" : "Open prospects"} value={String(open.length)} note={scope === "own" ? undefined : `${mine.length} yours`} />
        <StatTile label="Fresh signal" value={String(fresh.length)} note="A reason to write now" />
        <StatTile label="Signal gone stale" value={String(stale.length)} note="Check before writing" />
        <StatTile label="Hot (5–6 of 6)" value={String(hot.length)} />
      </div>

      <div className="flex flex-wrap gap-3">
        {can(s, "it.add") && <Link href="/it/signals" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Paste a buying signal</Link>}
        {can(s, "it.finder") && <Link href="/it/finder" className="inline-flex min-h-11 items-center rounded-md border border-head px-4 font-medium text-head no-underline hover:bg-head/10">Find agencies and IT firms</Link>}
        <Link href="/it/search" className="inline-flex min-h-11 items-center">Search strings</Link>
        {can(s, "it.add") && <Link href="/it/prospects/new" className="inline-flex min-h-11 items-center">Add a prospect by hand</Link>}
      </div>

      <section aria-labelledby="pipe-h" className="space-y-3">
        <h2 id="pipe-h" className="text-2xl">Pipeline</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {IT_STAGES.map((st) => (
            <li key={st.value}>
              <Link href={`/it/prospects?stage=${st.value}`} className="block rounded-lg border border-line bg-surface p-3 no-underline hover:border-head">
                <span className="block text-sm text-muted">{itStageLabel(st.value)}</span>
                <span className="block text-2xl text-head tabular-nums">{all.filter((p) => p.stage === st.value).length}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="seg-h" className="space-y-3">
        <h2 id="seg-h" className="text-2xl">Who we look for</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {SEGMENTS.map((seg) => (
            <li key={seg.value} className="space-y-2 rounded-lg border border-line bg-surface p-4">
              <h3 className="text-xl">{seg.label}</h3>
              <p>{seg.who}</p>
              <p className="text-muted">What we offer: {seg.sell}</p>
              <p><Link href={`/it/prospects?segment=${seg.value}`}>{all.filter((p) => p.segment === seg.value).length} prospects</Link></p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="new-h" className="space-y-3">
        <h2 id="new-h" className="text-2xl">Added lately</h2>
        {!newest.length ? <p className="text-muted">Nothing yet. Paste a buying signal or run the IT finder to add the first prospect.</p> : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {newest.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 bg-surface p-3">
                <Link href={`/it/prospects/${p.id}`} className="font-medium">{p.company}</Link>
                <Chip>{segmentInfo(p.segment).short}</Chip>
                <Chip variant={p.tier}>{TIER_LABEL[p.tier]}</Chip>
                {p.latest && <span className="text-muted">{signalInfo(p.latest.type).label}{p.latest.signalDate ? ` · ${p.latest.signalDate}` : ""}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { SectionHead } from "@/components/ui/SectionHead";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { DueText } from "@/components/leads/DueText";
import { RatiosTable } from "@/components/leads/RatiosTable";
import { SECTIONS } from "@/content/sections";
import { STAGES, stageLabel, channelLabel, type Stage } from "@/lib/leads/stages";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leads" };

const TIERS = [{ v: "hot", l: "Hot" }, { v: "warm", l: "Warm" }, { v: "skip", l: "Skip" }] as const;
const chipFor = { hot: "hot", warm: "warm", skip: "skip" } as const;

function Filter({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className="inline-flex min-h-11 items-center rounded-full border border-head px-4 text-sm font-medium text-head no-underline hover:bg-head/10 aria-[current=true]:bg-fill aria-[current=true]:text-on-fill"
    >
      {children}
    </Link>
  );
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ stage?: string; tier?: string }> }) {
  if (!(await getSession())) redirect("/login?next=/leads");
  const sp = await searchParams;
  const stage = STAGES.find((s) => s.value === sp.stage)?.value;
  const tier = TIERS.find((t) => t.v === sp.tier)?.v;

  const supabase = await createClient();
  let q = supabase.from("leads").select("*").order("next_action_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(500);
  if (stage) q = q.eq("stage", stage);
  if (tier) q = q.eq("tier", tier);
  const { data: leads } = await q;
  const href = (o: { stage?: string; tier?: string }) => {
    const p = new URLSearchParams();
    const s = "stage" in o ? o.stage : stage;
    const t = "tier" in o ? o.tier : tier;
    if (s) p.set("stage", s);
    if (t) p.set("tier", t);
    return "/leads" + (p.size ? "?" + p : "");
  };
  const track = SECTIONS.find((s) => s.id === "track")!;
  const ratioBlock = track.blocks.flatMap((b) => (b.type === "cards" ? b.cards.flat() : [b])).find((b) => b.type === "table");

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
      <section className="space-y-5">
        <SectionHead num="Pipeline" title="Leads" sub="One row per business, with the same 28 columns as the sheet. Next actions come from the Day 0, 2, 5, 9, 14 and 45 sequence." />
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/leads/new" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Add a lead</Link>
          <a href="/leads/export.csv" className="inline-flex min-h-11 items-center">Export CSV for Google Sheets</a>
        </div>
        <div role="group" aria-label="Stage" className="flex flex-wrap gap-2">
          <Filter href={href({ stage: undefined })} active={!stage}>All stages</Filter>
          {STAGES.map((s) => <Filter key={s.value} href={href({ stage: s.value })} active={stage === s.value}>{s.label}</Filter>)}
        </div>
        <div role="group" aria-label="Tier" className="flex flex-wrap gap-2">
          <Filter href={href({ tier: undefined })} active={!tier}>All tiers</Filter>
          {TIERS.map((t) => <Filter key={t.v} href={href({ tier: t.v })} active={tier === t.v}>{t.l}</Filter>)}
        </div>

        {!leads?.length ? (
          <p>{stage || tier ? "No leads match those filters." : "No leads yet. Add the first one, or create one from a saved kit."}</p>
        ) : (
          <TableWrap label="Leads" minWidth={860}>
            <thead>
              <tr>{["Business", "Where", "Tier", "Score", "Stage", "Next action", "Channel"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className={`${td} font-medium`}><Link href={`/leads/${l.id}`}>{l.business_name}</Link></td>
                  <td className={td}>{[l.category, [l.city, l.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</td>
                  <td className={td}><Chip variant={chipFor[l.tier]}>{l.tier === "hot" ? "Hot" : l.tier === "warm" ? "Warm" : "Skip"}</Chip></td>
                  <td className={`${td} tabular-nums`}>{l.score} / 10</td>
                  <td className={td}>{stageLabel(l.stage as Stage)}</td>
                  <td className={td}><DueText date={l.next_action_date} /></td>
                  <td className={td}>{channelLabel(l.channel as never)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-3xl">Your ratios</h2>
        <p className="max-w-3xl text-muted">The playbook&apos;s planning targets next to what your own leads show.</p>
        {ratioBlock && ratioBlock.type === "table" && <RatiosTable block={ratioBlock} />}
      </section>
    </div>
  );
}

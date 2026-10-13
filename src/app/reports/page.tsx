import type { Metadata } from "next";
import { RATIO_WHO } from "@/components/leads/RatiosTable";
import { RatiosChart } from "@/components/leads/RatiosChart";
import { SectionHead } from "@/components/ui/SectionHead";
import { StatTile } from "@/components/ui/StatTile";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { SECTIONS } from "@/content/sections";
import { limitOf } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { STAGES, type Stage } from "@/lib/leads/stages";
import { countByStage } from "@/lib/notices";
import { sizeOfCategory } from "@/lib/kit/categories";
import { SIZE_LABEL } from "@/lib/kit/extBoard";
import { COUNTRIES, COUNTRY_CODES, countryOf } from "@/lib/market/regions";

type Row = { first_contact_date: string | null; replied: boolean; stage: Stage };

/** One table of pipeline counts per segment: leads, contacted, replied, call booked, won. */
function SegmentTable({ id, title, segments }: { id: string; title: string; segments: { label: string; leads: Row[] }[] }) {
  return (
    <section aria-labelledby={id} className="min-w-0 space-y-3">
      <h2 id={id} className="text-2xl">{title}</h2>
      <TableWrap label={title} minWidth={640}>
        <thead><tr>{["Segment", "Leads", "Contacted", "Replied", "Call booked", "Won"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {segments.map(({ label, leads }) => {
            const c = countByStage(leads);
            return (
              <tr key={label}>
                <td className={`${td} font-medium`}>{label}</td>
                <td className={`${td} tabular-nums`}>{leads.length}</td>
                <td className={`${td} tabular-nums`}>{leads.filter((l) => l.first_contact_date).length}</td>
                <td className={`${td} tabular-nums`}>{leads.filter((l) => l.replied).length}</td>
                <td className={`${td} tabular-nums`}>{c.get("call_booked") ?? 0}</td>
                <td className={`${td} tabular-nums`}>{c.get("won") ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </section>
  );
}

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const s = await requirePerm("reports.view");
  const store = storeFor(s);
  const scope = s.perms["reports.view"].scope;
  const totalsOnly = limitOf(s, "reports.view") === "totals";
  const [data, dir] = await Promise.all([store.readScope("reports.view"), store.directory()]);
  const names = new Map(dir.map((d) => [d.username, d.fullName]));
  const counts = countByStage(data.leads);
  const track = SECTIONS.find((x) => x.id === "track")!;
  const ratioBlock = track.blocks.flatMap((b) => (b.type === "cards" ? b.cards.flat() : [b])).find((b) => b.type === "table");
  const who = RATIO_WHO[scope];
  const people = [...new Set(data.leads.map((l) => l.owner))].sort();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <SectionHead
        num="Reports"
        title="Reports"
        sub={totalsOnly ? "Totals across the workspace. No names, phone numbers, emails or social handles." : `The pipeline and ratios for ${who || "the"} leads.`}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Leads" value={String(data.leads.length)} />
        <StatTile label="Contacted" value={String(data.leads.filter((l) => l.first_contact_date).length)} />
        <StatTile label="Replied" value={String(data.leads.filter((l) => l.replied).length)} />
        <StatTile label="Won" value={String(counts.get("won") ?? 0)} />
      </div>

      <section aria-labelledby="stage-h" className="space-y-3">
        <h2 id="stage-h" className="text-2xl">Leads by stage</h2>
        <TableWrap label="Leads by stage" minWidth={420}>
          <thead><tr><th scope="col" className={th}>Stage</th><th scope="col" className={th}>Leads</th></tr></thead>
          <tbody>
            {STAGES.map((x) => <tr key={x.value}><td className={td}>{x.n} · {x.label}</td><td className={`${td} tabular-nums`}>{counts.get(x.value) ?? 0}</td></tr>)}
          </tbody>
        </TableWrap>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <SegmentTable
          id="size-h"
          title="By business size"
          segments={[
            ...(["small", "mid"] as const).map((z) => ({ label: SIZE_LABEL[z], leads: data.leads.filter((l) => sizeOfCategory(l.category ?? "") === z) })),
            ...(data.leads.some((l) => !sizeOfCategory(l.category ?? "")) ? [{ label: "Category not on the board", leads: data.leads.filter((l) => !sizeOfCategory(l.category ?? "")) }] : []),
          ]}
        />
        <SegmentTable
          id="country-h"
          title="By country"
          segments={COUNTRY_CODES.map((c) => ({ label: COUNTRIES[c].name, leads: data.leads.filter((l) => countryOf((l.state ?? "").toUpperCase()) === c) }))}
        />
      </div>

      {!totalsOnly && people.length > 1 && (
        <section aria-labelledby="who-h" className="space-y-3">
          <h2 id="who-h" className="text-2xl">By person</h2>
          <TableWrap label="By person" minWidth={640}>
            <thead><tr>{["Person", "Leads", "Contacted", "Replied", "Call booked", "Won"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {people.map((p) => {
                const mine = data.leads.filter((l) => l.owner === p);
                const c = countByStage(mine);
                return (
                  <tr key={p}>
                    <td className={`${td} font-medium`}>{names.get(p) ?? p}</td>
                    <td className={`${td} tabular-nums`}>{mine.length}</td>
                    <td className={`${td} tabular-nums`}>{mine.filter((l) => l.first_contact_date).length}</td>
                    <td className={`${td} tabular-nums`}>{mine.filter((l) => l.replied).length}</td>
                    <td className={`${td} tabular-nums`}>{c.get("call_booked") ?? 0}</td>
                    <td className={`${td} tabular-nums`}>{c.get("won") ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </section>
      )}

      {ratioBlock && ratioBlock.type === "table" && (
        <section aria-labelledby="rat-h" className="space-y-3">
          <h2 id="rat-h" className="text-2xl">Ratios</h2>
          <RatiosChart block={ratioBlock} />
        </section>
      )}
    </div>
  );
}

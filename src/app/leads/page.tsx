import type { Metadata } from "next";
import Link from "next/link";
import { SectionHead } from "@/components/ui/SectionHead";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadsTable, type LeadRowData } from "@/components/leads/LeadsTable";
import { RATIO_WHO } from "@/components/leads/RatiosTable";
import { RatiosChart } from "@/components/leads/RatiosChart";
import { SECTIONS } from "@/content/sections";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { STAGES } from "@/lib/leads/stages";
import { sizeOfCategory } from "@/lib/kit/categories";
import { SIZE_LABEL, type Size } from "@/lib/kit/extBoard";
import { COUNTRIES, COUNTRY_CODES, countryOf, isCountry, type Country } from "@/lib/market/regions";

export const metadata: Metadata = { title: "Leads" };

const TIERS = [{ v: "hot", l: "Hot" }, { v: "warm", l: "Warm" }, { v: "skip", l: "Skip" }] as const;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ stage?: string; tier?: string; by?: string; country?: string; size?: string }> }) {
  const s = await requirePerm("leads.view");
  const store = storeFor(s);
  const sp = await searchParams;
  const stage = STAGES.find((x) => x.value === sp.stage)?.value;
  const tier = TIERS.find((t) => t.v === sp.tier)?.v;
  const scope = s.perms["leads.view"].scope;
  const researcher = s.perms["leads.add"].scope === "queue";

  const [all, dir, ws] = await Promise.all([store.listLeads(), store.directory(), store.getWorkspace()]);
  const canFind = can(s, "finder.run") && ws.features.leadFinder;
  const names = new Map(dir.map((d) => [d.username, d.firstName]));
  const showHolder = scope !== "own" || researcher;
  const heldKeys = new Set(all.map((l) => l.heldBy ?? "unassigned"));
  const by = showHolder && sp.by && heldKeys.has(sp.by) ? sp.by : undefined;
  const heldKey = (l: (typeof all)[number]) => l.heldBy ?? "unassigned";
  // Market filters: the country follows from the region code, the size from the category.
  const countryOfLead = (l: (typeof all)[number]): Country => countryOf(l.state.toUpperCase());
  const sizeOfLead = (l: (typeof all)[number]): Size | "other" => sizeOfCategory(l.category ?? "") ?? "other";
  const country = isCountry(sp.country) ? sp.country : undefined;
  const size = sp.size === "small" || sp.size === "mid" ? sp.size : undefined;
  const inMarket = all.filter((l) => (!country || countryOfLead(l) === country) && (!size || sizeOfLead(l) === size));
  const countryOptions = COUNTRY_CODES.map((c) => ({ v: c, l: COUNTRIES[c].short, count: all.filter((l) => countryOfLead(l) === c).length })).filter((o) => o.count > 0 || o.v === country);
  const sizeOptions = (["small", "mid"] as const).map((z) => ({ v: z, l: SIZE_LABEL[z], count: all.filter((l) => sizeOfLead(l) === z && (!country || countryOfLead(l) === country)).length }));
  const byHolder = inMarket.filter((l) => !by || heldKey(l) === by);
  const leads = byHolder.filter((l) => (!stage || l.stage === stage) && (!tier || l.tier === tier));
  const stageCounts: Record<string, number> = {};
  const tierCounts: Record<string, number> = {};
  for (const l of byHolder) { stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1; tierCounts[l.tier] = (tierCounts[l.tier] ?? 0) + 1; }
  const holders = showHolder
    ? [...heldKeys].map((k) => ({
        value: k,
        label: k === "unassigned" ? "Unassigned" : k === s.user.username ? "You" : (names.get(k) ?? k),
        count: inMarket.filter((l) => heldKey(l) === k && (!stage || l.stage === stage) && (!tier || l.tier === tier)).length,
      })).sort((a, b) => (a.value === s.user.username ? -1 : b.value === s.user.username ? 1 : a.label.localeCompare(b.label)))
    : null;
  const holder = (heldBy: string | null, owner: string) => (heldBy === null ? "Unassigned" : heldBy === s.user.username ? "You" : `${researcher ? "With " : ""}${names.get(heldBy) ?? heldBy}`) + (heldBy !== owner && owner !== s.user.username && !researcher ? ` (from ${names.get(owner) ?? owner})` : "");

  const track = SECTIONS.find((x) => x.id === "track")!;
  const ratioBlock = track.blocks.flatMap((b) => (b.type === "cards" ? b.cards.flat() : [b])).find((b) => b.type === "table");
  const title = researcher ? "My sourced leads" : scope === "own" ? "My leads" : scope === "team" ? "Team leads" : "Leads";
  const sub = scope === "own"
    ? "One row per business, with the same 28 columns as the sheet. Next actions come from the Day 0, 2, 5, 9, 14 and 45 sequence."
    : scope === "team" ? "Your team's pipeline, read-only. Open a lead to comment on it." : "Everyone's pipeline, read-only. Open a lead to comment on it.";

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
      <section className="space-y-5">
        <SectionHead num="Pipeline" title={title} sub={sub} />
        <div className="flex flex-wrap items-center gap-3">
          {canFind && <Link href="/sourcing/finder" className="inline-flex min-h-11 items-center rounded-md border border-head px-4 font-medium text-head no-underline hover:bg-head/10">Find leads</Link>}
          {can(s, "leads.add") && <Link href="/leads/new" className="inline-flex min-h-11 items-center rounded-md border border-fill bg-fill px-4 font-medium text-on-fill no-underline">Add a lead</Link>}
          {can(s, "leads.export") && <a href="/leads/export.csv" className="inline-flex min-h-11 items-center">Export CSV for Google Sheets</a>}
          {can(s, "leads.add") && <Link href="/leads/import" className="inline-flex min-h-11 items-center">Import CSV</Link>}
        </div>
        <LeadFilters stage={stage} tier={tier} by={by} tiers={TIERS.map((x) => ({ v: x.v, l: x.l }))} stageCounts={stageCounts} tierCounts={tierCounts} holders={holders} holderLabel={researcher ? "With" : "Held by"} country={country} size={size} countryOptions={countryOptions} sizeOptions={sizeOptions} />

        {!leads.length ? (
          <p>{stage || tier || by || country || size ? "No leads match those filters." : "No leads yet. Add the first one, or create one from a saved kit."}</p>
        ) : (
          <LeadsTable
            showHolder={showHolder}
            holderLabel={researcher ? "With" : "Held by"}
            rows={leads.map((l): LeadRowData => ({
              id: l.id, business: l.business_name, category: l.category ?? "", where: [l.city, l.state].filter(Boolean).join(", "),
              size: sizeOfCategory(l.category ?? ""), country: l.state ? countryOfLead(l) : null,
              tier: l.tier, score: l.score, stage: l.stage, next: l.next_action_date, channel: l.channel,
              holder: holder(l.heldBy, l.owner) + (l.pendingTo ? " (not accepted yet)" : ""),
            }))}
          />
        )}
      </section>

      {can(s, "reports.view") && ratioBlock && ratioBlock.type === "table" && (
        <section className="space-y-4">
          <h2 className="text-3xl">Ratios</h2>
          <p className="max-w-3xl text-muted">The playbook&apos;s planning targets next to what {RATIO_WHO[s.perms["reports.view"].scope] || "the"} leads show.</p>
          <RatiosChart block={ratioBlock} />
        </section>
      )}
    </div>
  );
}

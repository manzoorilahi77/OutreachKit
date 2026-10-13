import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KitSettingsForm } from "@/components/kit/KitSettingsForm";
import { SavedKitView } from "@/components/kit/SavedKitView";
import { Chip } from "@/components/ui/Chip";
import { Note } from "@/components/ui/Note";
import { StatTile } from "@/components/ui/StatTile";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { DueText } from "@/components/leads/DueText";
import { cleanRates } from "@/lib/market/currency";
import { isSiteLang } from "@/lib/market/notes";
import { isRegion } from "@/lib/market/regions";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { findCategory } from "@/lib/kit/categories";
import { loadCategoryKit } from "@/lib/kit-v2/load";
import { isDirectionId } from "@/lib/kit-v2/themes";
import { STAGES, stageLabel, channelLabel, type Stage } from "@/lib/leads/stages";
import { KIT_STATUS_LABEL } from "@/lib/store/kitText";
import { isId } from "@/lib/store/paths";

export const metadata: Metadata = { title: "Kit" };

const TABS = [["kit", "Kit"], ["leads", "Leads"], ["activity", "Activity"], ["settings", "Settings"]] as const;

export default async function KitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requirePerm("kits.view");
  if (!isId(id)) notFound();
  const store = storeFor(s);
  const kit = (await store.listKits()).find((k) => k.id === id);
  if (!kit || !isRegion(kit.state) || !findCategory(kit.category)) notFound();

  const mine = kit.owner === s.user.username;
  const seesLeads = can(s, "leads.view");
  const tabs = TABS.filter(([t]) => (t === "leads" || t === "activity" ? seesLeads : t === "settings" ? mine && can(s, "kits.save") : true));
  const tab = tabs.find(([t]) => t === sp.tab)?.[0] ?? "kit";

  const [ws, dir, teams] = await Promise.all([store.getWorkspace(), store.directory(), store.getTeams()]);
  const owner = dir.find((d) => d.username === kit.owner);
  const stats = (await store.kitStats([kit])).get(kit.id)!;

  const all = seesLeads ? await store.listLeads() : [];
  const same = (l: { category: string; state: string; city: string }) =>
    l.category.toLowerCase() === kit.category.toLowerCase() && l.state.toUpperCase() === kit.state.toUpperCase() && l.city.toLowerCase() === kit.city.toLowerCase();
  const leads = all.filter((l) => l.owner === kit.owner && (l.kit_id === kit.id || same(l)));
  const incoming = mine && can(s, "leads.edit") ? (await store.incoming()).filter((i) => same(i.lead)) : [];
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = leads.filter((l) => l.next_action_date !== null && l.next_action_date <= today).length;
  const byStage = (st: Stage) => leads.filter((l) => l.stage === st).length;

  const input = {
    cat: kit.category, device: kit.device, st: kit.state, city: kit.city, you: owner?.fullName, brand: ws.studio, domain: ws.demoDomain,
    ...(isSiteLang(kit.site_lang) ? { lang: kit.site_lang } : {}),
  };
  const ck = tab === "kit" ? await loadCategoryKit(kit.category) : null;
  const href = (t: string) => `/kits/${kit.id}${t === "kit" ? "" : `?tab=${t}`}`;

  const events = tab === "activity"
    ? (await Promise.all(leads.map((l) => store.leadEvents(l.owner, l.id).then((evs) => evs.map((e) => ({ e, l })))))).flat()
        .sort((a, b) => b.e.created_at.localeCompare(a.e.created_at)).slice(0, 60)
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <p><Link href="/kits">← Kits</Link></p>
      <header className="space-y-2">
        <h1 className="text-4xl leading-tight">{kit.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Chip variant={kit.status === "active" ? "tier-a" : "plain"}>{KIT_STATUS_LABEL[kit.status]}</Chip>
          <span className="text-muted">{owner?.fullName ?? kit.owner}{owner?.team ? ` · ${teams.teams.find((t) => t.id === owner.team)?.name ?? ""}` : ""}</span>
          {ws.basedLine && <span className="text-muted">{ws.basedLine}</span>}
        </div>
      </header>

      <nav aria-label="Kit sections" className="flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map(([t, label]) => (
          <Link
            key={t}
            href={href(t)}
            aria-current={tab === t ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-full border border-head px-4 text-sm font-medium text-head no-underline hover:bg-head/10 aria-[current=page]:bg-fill aria-[current=page]:text-on-fill"
          >
            {label}{t === "leads" ? ` (${leads.length})` : ""}
          </Link>
        ))}
      </nav>

      {seesLeads && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Sourced" value={String(stats.leads)} />
          <StatTile label="Qualified" value={String(byStage("qualified"))} />
          <StatTile label="Contacted" value={String(stats.contacted)} />
          <StatTile label="Replied" value={String(stats.replied)} />
          <StatTile label="Call booked" value={String(byStage("call_booked"))} />
        </div>
      )}
      {mine && dueToday > 0 && <Note><p>Due today: the next step on {dueToday} lead{dueToday === 1 ? "" : "s"}. <Link href="/today">Open Today</Link>.</p></Note>}
      {incoming.length > 0 && <Note tone="firm"><p>Assigned to you: {incoming.length} lead{incoming.length === 1 ? "" : "s"} for this kit. <Link href="/today">Accept them on Today</Link>.</p></Note>}

      {tab === "kit" && (
        <SavedKitView
          input={input}
          ck={ck}
          rates={cleanRates(ws.markets?.rates)}
          direction={isDirectionId(kit.direction) ? kit.direction : "b"}
          actions={mine && can(s, "leads.add") ? <Link href={`/leads/new?kit=${kit.id}`} className="inline-flex min-h-11 items-center">Create a lead from this kit</Link> : undefined}
        />
      )}

      {tab === "leads" && (
        !leads.length ? <p>No leads for this kit yet.{mine && can(s, "leads.add") && <> <Link href={`/leads/new?kit=${kit.id}`}>Add the first lead</Link>.</>}</p> : (
          <TableWrap label="Leads for this kit" minWidth={760}>
            <thead><tr>{["Business", "Stage", "Score", "Next action", "Channel"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className={`${td} font-medium`}><Link href={`/leads/${l.id}`}>{l.business_name}</Link></td>
                  <td className={td}>{stageLabel(l.stage as Stage)}</td>
                  <td className={`${td} tabular-nums`}>{l.score} / 10</td>
                  <td className={td}><DueText date={l.next_action_date} /></td>
                  <td className={td}>{channelLabel(l.channel)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      )}

      {tab === "activity" && (
        !events.length ? <p className="text-muted">Nothing yet.</p> : (
          <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {events.map(({ e, l }) => (
              <li key={e.id} className="grid gap-1 bg-surface p-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
                <span className="tabular-nums text-muted">{e.occurred_on}</span>
                <span>
                  <Link href={`/leads/${l.id}`}>{l.business_name}</Link>{" · "}
                  {e.kind === "stage_change" ? (e.from_stage ? `moved from ${stageLabel(e.from_stage)} to ${stageLabel(e.to_stage as Stage)}` : `added as ${stageLabel(e.to_stage as Stage)}`)
                    : e.kind === "comment" ? `comment: ${e.note}` : `${channelLabel(e.channel as never) || "touch"}${e.note ? `, ${e.note}` : ""}`}
                </span>
              </li>
            ))}
          </ol>
        )
      )}

      {tab === "settings" && (
        <section className="space-y-4">
          <h2 className="text-2xl">Settings</h2>
          <KitSettingsForm id={kit.id} title={kit.title} status={kit.status} />
          <p className="text-muted">{STAGES.length} stages are tracked for the leads of this kit. Saved kits store only their inputs and are rebuilt every time you open them.</p>
        </section>
      )}
    </div>
  );
}

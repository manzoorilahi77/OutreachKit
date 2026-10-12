import { InlineView } from "@/components/playbook/InlineView";
import { Chip } from "@/components/ui/Chip";
import type { Block } from "@/content/types";
import { can } from "@/lib/auth/permissions";
import { getSession, storeFor } from "@/lib/auth/server";
import { liveRatios, formatRatio, MIN_LEADS } from "@/lib/leads/ratios";
import { axisMax, clampPct, inlineText, parseTarget, standing } from "@/lib/leads/ratioChart";
import { RATIO_WHO } from "./RatiosTable";

type TableBlock = Extract<Block, { type: "table" }>;
const ORDER = ["sourcedToQualified", "contactedToReplied", "repliedToCall", "callToProposal", "proposalToWon"] as const;
const STANDING = { below: "Below target", inside: "Inside target", above: "Above target" } as const;

/**
 * The six ratios as a chart. Each row is a track from 0 to a round maximum, with the playbook's planning target as a shaded band
 * and the live ratio as a marker. Status is also written out ("Inside target"), so nothing depends on seeing a colour.
 */
export async function RatiosChart({ block }: { block: TableBlock }) {
  const session = await getSession();
  let live: ReturnType<typeof liveRatios> | null = null;
  let leadCount = 0;
  const who = session ? RATIO_WHO[session.perms["reports.view"].scope] : "";
  if (session && can(session, "reports.view")) {
    const store = storeFor(session);
    leadCount = (await store.readScope("reports.view")).leads.length;
    live = liveRatios(leadCount >= MIN_LEADS ? await store.stageEvents("reports.view") : [], leadCount);
  }
  const unlocked = leadCount >= MIN_LEADS;
  const pctToUnlock = Math.min(100, (leadCount / MIN_LEADS) * 100);

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-head">{unlocked ? "Live ratios are on" : "Live ratios unlock at 100 leads"}</p>
          <p className="tabular-nums text-muted">{leadCount} of {MIN_LEADS} {who ? `${who} ` : ""}leads</p>
        </div>
        <div role="img" aria-label={`${leadCount} of ${MIN_LEADS} leads`} className="h-3 overflow-hidden rounded-full border border-head">
          <div className="h-full bg-fill" style={{ width: `${pctToUnlock}%` }} />
        </div>
        {!unlocked && <p className="text-sm text-muted">Before then the planning targets are the better guide. The bands below are those targets.</p>}
      </div>

      <ul className="space-y-6" aria-label="The six ratios">
        {block.rows.map((r, i) => {
          const target = parseTarget(inlineText(r[1]!.inline));
          const isPct = inlineText(r[1]!.inline).includes("%");
          const ratio = i > 0 && live ? live[ORDER[i - 1]!] : null;
          const value = ratio && ratio.enough && ratio.value !== null ? ratio.value * 100 : null;
          const max = target && isPct ? axisMax(target.hi, value) : 100;
          const ticks = [0, max / 2, max];
          const where = target && isPct && value !== null ? standing(value, target) : null;
          const sentence =
            i === 0 ? "Not tracked in the app"
            : ratio === null ? "No live data"
            : ratio.enough ? `${formatRatio(ratio)}${ratio.value === null ? "" : ` (${ratio.reached} of ${ratio.of})`}`
            : "Not enough data yet";
          return (
            <li key={i} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-lg font-medium text-head"><InlineView parts={r[0]!.inline} /></p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-muted">Target <span className="tabular-nums"><InlineView parts={r[1]!.inline} /></span></span>
                  <span className="tabular-nums font-medium text-head">{sentence}</span>
                  {where && <Chip variant={where === "inside" ? "tier-a" : "tier-b"}>{STANDING[where]}</Chip>}
                </p>
              </div>
              {target && isPct ? (
                <div>
                  <div
                    role="img"
                    aria-label={`Target ${target.lo} to ${target.hi} percent${value !== null ? `; live ${Math.round(value * 10) / 10} percent` : "; no live value yet"}`}
                    className="relative h-6 rounded-full border border-line bg-surface"
                  >
                    <div className="absolute inset-y-0 border-x-2 border-head bg-head/20" style={{ left: `${clampPct(target.lo, max)}%`, width: `${Math.max(0.8, clampPct(target.hi, max) - clampPct(target.lo, max))}%` }} />
                    {value !== null && (
                      <div className="absolute -inset-y-1 w-2 -translate-x-1/2 rounded-sm border-2 border-bg bg-accent" style={{ left: `${clampPct(value, max)}%` }} />
                    )}
                  </div>
                  <div className="mt-1 flex justify-between text-sm tabular-nums text-muted" aria-hidden>
                    {ticks.map((t) => <span key={t}>{Math.round(t * 10) / 10}%</span>)}
                  </div>
                </div>
              ) : (
                <p className="text-muted">A daily habit, not a funnel step: {inlineText(r[1]!.inline)} profiles checked per hour of sourcing.</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted" aria-hidden>
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-8 border-x-2 border-head bg-head/20" /> Planning target</span>
        <span className="flex items-center gap-2"><span className="inline-block h-5 w-2 rounded-sm border-2 border-bg bg-accent" /> Live ratio</span>
      </div>
    </div>
  );
}

import { FLOW_RANK, type Stage } from "./stages";

export interface StageEvent { lead_id: string; to_stage: Stage | null }

/** Leads that reached each flow rank (1 = sourced … 7 = proposal sent), and how many were won. */
export function reached(events: StageEvent[]): { atLeast: number[]; won: number } {
  const best = new Map<string, number>();
  const won = new Set<string>();
  for (const e of events) {
    if (!e.to_stage) continue;
    const rank = FLOW_RANK[e.to_stage];
    if (rank !== undefined) best.set(e.lead_id, Math.max(best.get(e.lead_id) ?? 0, rank));
    if (e.to_stage === "won") won.add(e.lead_id);
  }
  const atLeast = [0, 0, 0, 0, 0, 0, 0, 0]; // index = rank
  for (const r of best.values()) for (let k = 1; k <= r; k++) atLeast[k]!++;
  return { atLeast, won: won.size };
}

export const MIN_LEADS = 100;

export type LiveRatio = { enough: false; leads: number } | { enough: true; value: number | null; of: number; reached: number };

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

/** The five tracked ratios of section 09, in table order (profiles per hour is not tracked). */
export function liveRatios(events: StageEvent[], leadCount: number): Record<"sourcedToQualified" | "contactedToReplied" | "repliedToCall" | "callToProposal" | "proposalToWon", LiveRatio> {
  const { atLeast: a, won } = reached(events);
  const pair = (num: number, den: number): LiveRatio =>
    leadCount < MIN_LEADS ? { enough: false, leads: leadCount } : { enough: true, value: ratio(num, den), of: den, reached: num };
  return {
    sourcedToQualified: pair(a[2]!, a[1]!),
    contactedToReplied: pair(a[5]!, a[4]!),
    repliedToCall: pair(a[6]!, a[5]!),
    callToProposal: pair(a[7]!, a[6]!),
    proposalToWon: pair(won, a[7]!),
  };
}

export function formatRatio(r: LiveRatio): string {
  if (!r.enough) return "Not enough data";
  if (r.value === null) return "No leads at this stage yet";
  return `${Math.round(r.value * 1000) / 10}%`;
}

// In-app notices, computed from lead events: a team lead reached Replied, Call booked, Proposal sent or Won. Nothing is emailed.
import type { Stage } from "@/lib/leads/stages";
import type { LeadEvent } from "@/lib/store/types";

export const NOTICE_STAGES: Stage[] = ["replied", "call_booked", "proposal_sent", "won"];
export const NOTICE_DAYS = 14;

export interface Notice { leadId: string; owner: string; business: string; stage: Stage; at: string }

export function noticesFrom(
  events: LeadEvent[],
  leads: { id: string; owner: string; business_name: string; stage: Stage }[],
  nowMs: number,
  days = NOTICE_DAYS,
): Notice[] {
  const byId = new Map(leads.map((l) => [l.id, l]));
  const since = nowMs - days * 86_400_000;
  const out: Notice[] = [];
  for (const e of events) {
    if (e.kind !== "stage_change" || !e.to_stage || !NOTICE_STAGES.includes(e.to_stage)) continue;
    const l = byId.get(e.lead_id);
    if (!l || Date.parse(e.created_at) < since) continue;
    out.push({ leadId: l.id, owner: l.owner, business: l.business_name, stage: e.to_stage, at: e.created_at });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function countByStage(leads: { stage: Stage }[]): Map<Stage, number> {
  const m = new Map<Stage, number>();
  for (const l of leads) m.set(l.stage, (m.get(l.stage) ?? 0) + 1);
  return m;
}

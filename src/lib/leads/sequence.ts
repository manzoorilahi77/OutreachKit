import type { Channel, Stage } from "./stages";

/** The contact sequence of section 10: Day 0 / 2 / 5 / 9 / 14 / 45. */
export const SEQUENCE: { day: number; title: string; channel: Channel }[] = [
  { day: 0, title: "Instagram or Facebook DM", channel: "instagram_dm" },
  { day: 2, title: "Call the published business line", channel: "call" },
  { day: 5, title: "Email the public business address", channel: "email" },
  { day: 9, title: "Second call, different time of day", channel: "call" },
  { day: 14, title: "The takedown note", channel: "instagram_dm" },
  { day: 45, title: "Nurture", channel: "other" },
];

/** Dates are YYYY-MM-DD strings, computed in UTC so there is no daylight-saving drift. */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Date of the next sequence step, given the first contact date and how many steps are done. */
export function nextActionDate(firstContact: string | null, stepsDone: number): string | null {
  if (!firstContact || stepsDone >= SEQUENCE.length) return null;
  return addDays(firstContact, SEQUENCE[stepsDone]!.day);
}

export interface LeadState {
  stage: Stage;
  replied: boolean;
  first_contact_date: string | null;
  demo_built_date: string | null;
  sequence_step: number;
  next_action_date: string | null;
}

/** What changes on the lead when it moves to `to` today. */
export function stageChangePatch(lead: LeadState, to: Stage, today: string): Partial<LeadState> {
  const patch: Partial<LeadState> = { stage: to };
  switch (to) {
    case "demo_built":
      patch.demo_built_date = lead.demo_built_date ?? today;
      break;
    case "contacted": {
      const first = lead.first_contact_date ?? today;
      const step = Math.max(lead.sequence_step, 1); // the first message is Day 0
      patch.first_contact_date = first;
      patch.sequence_step = step;
      patch.next_action_date = nextActionDate(first, step);
      break;
    }
    case "replied":
    case "call_booked":
    case "proposal_sent":
      patch.replied = true;
      patch.next_action_date = null; // a person is talking to you: the sequence stops
      break;
    case "won":
    case "lost":
      patch.next_action_date = null;
      break;
    case "nurture": {
      // Day 45 is the first nurture note; after that, quarterly. Never a deletion.
      const day45 = lead.first_contact_date ? addDays(lead.first_contact_date, 45) : null;
      patch.next_action_date = day45 && day45 > today ? day45 : addDays(today, 90);
      break;
    }
    default:
      break;
  }
  return patch;
}

/** Logging a contact touch completes the next sequence step. */
export function touchPatch(lead: LeadState): Partial<LeadState> {
  const step = Math.min(lead.sequence_step + 1, SEQUENCE.length);
  return { sequence_step: step, next_action_date: nextActionDate(lead.first_contact_date, step) };
}

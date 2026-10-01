import type { Enums } from "@/lib/supabase/database.types";

export type Stage = Enums<"lead_stage">;

/** The 8 pipeline stages of section 09. Stage 08 is "Won / Lost / Nurture", so it has three values. */
export const STAGES: { value: Stage; n: string; label: string }[] = [
  { value: "sourced", n: "01", label: "Sourced" },
  { value: "qualified", n: "02", label: "Qualified" },
  { value: "demo_built", n: "03", label: "Demo built" },
  { value: "contacted", n: "04", label: "Contacted" },
  { value: "replied", n: "05", label: "Replied" },
  { value: "call_booked", n: "06", label: "Call booked" },
  { value: "proposal_sent", n: "07", label: "Proposal sent" },
  { value: "won", n: "08", label: "Won" },
  { value: "lost", n: "08", label: "Lost" },
  { value: "nurture", n: "08", label: "Nurture" },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.value === s)!.label;

/** Position in the pipeline. Won also counts as having reached proposal; lost and nurture imply nothing beyond their events. */
export const FLOW_RANK: Partial<Record<Stage, number>> = {
  sourced: 1, qualified: 2, demo_built: 3, contacted: 4, replied: 5, call_booked: 6, proposal_sent: 7, won: 7,
};

export type Channel = "instagram_dm" | "facebook_dm" | "call" | "email" | "other";
export const CHANNELS: { value: Channel; label: string }[] = [
  { value: "instagram_dm", label: "Instagram DM" },
  { value: "facebook_dm", label: "Facebook DM" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];
export const channelLabel = (c: Channel | null | undefined) => CHANNELS.find((x) => x.value === c)?.label ?? "";

// IT Prospects: the words and rules of the area. Segments, signal types, pipeline stages and the qualifier come from
// The Outreach Reset (docs/source/outreach-reset.html, sections 04–07). Nothing here is shared with the local leads.
import type { Country } from "@/lib/market/regions";

export type Segment = "agency" | "buyer" | "it_need";

export interface SegmentInfo { value: Segment; label: string; short: string; who: string; sell: string }

export const SEGMENTS: readonly SegmentInfo[] = [
  {
    value: "buyer", label: "Live buying signal", short: "Buying signal",
    who: "A company with an open developer or IT role, a posted project, a tender for software or a website, or a public “looking for a developer” post.",
    sell: "The project itself, or a small paid test: a 2-week trial developer or one backlog feature at a fixed price.",
  },
  {
    value: "agency", label: "IT and digital business", short: "Agency / IT firm",
    who: "Digital, web and SEO agencies, creative studios, software houses, app developers, IT services firms and IT consultancies.",
    sell: "White-label overflow development: one paid test ticket under their brand, then a monthly capacity plan.",
  },
  {
    value: "it_need", label: "Business with an IT need", short: "IT need",
    who: "A growing business whose visible signal is an IT or operations gap: hiring IT support, data entry or an ops admin; running on spreadsheets; an outdated portal.",
    sell: "A workflow audit or discovery sprint, then a fixed-price build of the portal, integration or system.",
  },
];

export const isSegment = (v: unknown): v is Segment => SEGMENTS.some((s) => s.value === v);
export const segmentInfo = (v: Segment): SegmentInfo => SEGMENTS.find((s) => s.value === v)!;

export type SignalType = "dev_role" | "it_role" | "project_post" | "tender" | "looking_for" | "ai_rescue" | "site_launch";

export interface SignalInfo {
  value: SignalType;
  label: string;
  /** What counts as this signal. */
  what: string;
  example: string;
  /** After this many days the signal is stale: the post has probably closed or the moment has passed. */
  staleDays: number;
  /** The segment a prospect made from this signal starts in. */
  segment: Segment;
}

export const SIGNAL_TYPES: readonly SignalInfo[] = [
  {
    value: "dev_role", label: "Open developer role", segment: "buyer", staleDays: 60,
    what: "A job post for a developer, engineer or technical PM. A role open 30+ days, or several similar roles, is the strongest version.",
    example: "“Senior React Developer (remote, US)” posted 34 days ago by a 40-person logistics company.",
  },
  {
    value: "it_role", label: "Open IT or operations role", segment: "it_need", staleDays: 60,
    what: "A post for IT support, a systems admin, data entry or an operations admin: a sign the work could be a system instead.",
    example: "“Office administrator, must be great with spreadsheets and our order tracker” at a 3-location distributor.",
  },
  {
    value: "project_post", label: "Project post", segment: "buyer", staleDays: 14,
    what: "A company invites freelancers or agencies to quote, share a portfolio or send commercials for a defined piece of work.",
    example: "“Looking for an agency to rebuild our booking portal. Share your portfolio and commercials.”",
  },
  {
    value: "tender", label: "RFP or tender", segment: "buyer", staleDays: 30,
    what: "A public request for proposal, tender or solicitation for software, a website, IT services or a system.",
    example: "A city RFP for a permit-tracking web application, closing in three weeks.",
  },
  {
    value: "looking_for", label: "“Looking for” post", segment: "buyer", staleDays: 14,
    what: "A public post from a founder or manager asking for a developer, agency or recommendation.",
    example: "“Can anyone recommend a dev shop that does Shopify plus custom integrations?”",
  },
  {
    value: "ai_rescue", label: "AI-built app needs help", segment: "buyer", staleDays: 30,
    what: "An app built quickly with AI tools that has bugs, security gaps or can't scale, and its owner says so.",
    example: "“Built our MVP with an AI builder, now logins break and we need someone to clean it up.”",
  },
  {
    value: "site_launch", label: "Agency launched a client site", segment: "agency", staleDays: 60,
    what: "An agency launched a client site in the last 60 days. Used as the trigger for the white-label email (Reset, A/B test version B).",
    example: "A web agency's case-study post about the new site for a regional bank.",
  },
];

export const isSignalType = (v: unknown): v is SignalType => SIGNAL_TYPES.some((s) => s.value === v);
export const signalInfo = (v: SignalType): SignalInfo => SIGNAL_TYPES.find((s) => s.value === v)!;

export type ItStage = "new" | "qualified" | "contacted" | "replied" | "call" | "won" | "lost" | "parked";

export const IT_STAGES: readonly { value: ItStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "call", label: "Call booked" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "parked", label: "Parked" },
];

export const isItStage = (v: unknown): v is ItStage => IT_STAGES.some((s) => s.value === v);
export const itStageLabel = (v: ItStage): string => IT_STAGES.find((s) => s.value === v)?.label ?? v;
export const OPEN_IT_STAGES: readonly ItStage[] = ["new", "qualified", "contacted", "replied", "call"];

/** The Reset's six segment factors, asked of one company. */
export type QualKey = "budget" | "buys_often" | "reachable" | "offshore_ok" | "proof_fit" | "trigger";

export const QUALIFIER: readonly { key: QualKey; label: string; hint: string }[] = [
  { key: "budget", label: "Has budget", hint: "They already pay for development: a salaried role, an agency with client work, a funded tender." },
  { key: "buys_often", label: "Buys often", hint: "The need repeats: an agency with a client pipeline, several open roles, a long backlog." },
  { key: "reachable", label: "Reachable", hint: "You have a named decision-maker and a way to reach them (email, LinkedIn or phone)." },
  { key: "offshore_ok", label: "Accepts an offshore team", hint: "Remote role, existing offshore or white-label partners, or no on-site requirement." },
  { key: "proof_fit", label: "Our proof fits", hint: "Their stack or project matches work we can show (ordering, booking, auctions, portals, React, Node, WordPress)." },
  { key: "trigger", label: "Visible trigger", hint: "A dated reason to write now. Ticked automatically while a signal is fresh." },
];

export type Qualifier = Record<QualKey, boolean>;
export const EMPTY_QUALIFIER: Qualifier = { budget: false, buys_often: false, reachable: false, offshore_ok: false, proof_fit: false, trigger: false };

export type ItTier = "hot" | "warm" | "skip";

/** Out of 6. A fresh signal counts as the trigger. Hot is 5–6, warm 3–4, skip 0–2. */
export function qualScore(q: Qualifier, freshSignal: boolean): { score: number; tier: ItTier } {
  const score = QUALIFIER.filter((f) => (f.key === "trigger" ? q.trigger || freshSignal : q[f.key])).length;
  return { score, tier: score >= 5 ? "hot" : score >= 3 ? "warm" : "skip" };
}

export const TIER_LABEL: Record<ItTier, string> = { hot: "Hot", warm: "Warm", skip: "Skip" };

export const TEAM_SIZES = ["1–10", "11–50", "51–200", "201+"] as const;
export const isTeamSize = (v: unknown): boolean => v === "" || (TEAM_SIZES as readonly string[]).includes(v as string);

export type ProspectSource = "manual" | "finder" | "signal" | "import";

const DAY_MS = 86_400_000;

/** Whole days from `date` to `today` (both YYYY-MM-DD), or null without a date. */
export function daysSince(date: string | null, today: string): number | null {
  if (!date) return null;
  const a = Date.parse(date + "T00:00:00Z"), b = Date.parse(today + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.floor((b - a) / DAY_MS);
}

/** A signal without a date is never fresh: a person can't tell how old it is either. */
export function isFresh(type: SignalType, date: string | null, today: string): boolean {
  const d = daysSince(date, today);
  return d !== null && d >= 0 && d <= signalInfo(type).staleDays;
}

export interface ItSignal {
  id: string;
  prospectId: string;
  type: SignalType;
  url: string;
  quote: string;
  signalDate: string | null;
  source: string;
  addedBy: string;
  createdAt: string;
}

export interface ItProspect {
  id: string;
  owner: string;
  assignee: string | null;
  segment: Segment;
  company: string;
  companyDomain: string;
  websiteUrl: string;
  linkedinUrl: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  region: string;
  country: Country;
  teamSize: string;
  mapsUrl: string;
  mapsCategory: string;
  rating: number | null;
  reviewCount: number | null;
  stage: ItStage;
  qualifier: Qualifier;
  notes: string;
  source: ProspectSource;
  createdAt: string;
  updatedAt: string;
}

export type SignalState = "fresh" | "stale" | "none";

export interface ItProspectView extends ItProspect {
  signals: ItSignal[];
  latest: ItSignal | null;
  signalState: SignalState;
  score: number;
  tier: ItTier;
}

/** Signals newest first (by date, then when they were added); state from the newest dated one. */
export function toProspectView(p: ItProspect, signals: ItSignal[], today: string): ItProspectView {
  const sorted = [...signals].sort((a, b) => (b.signalDate ?? "").localeCompare(a.signalDate ?? "") || b.createdAt.localeCompare(a.createdAt));
  const latest = sorted[0] ?? null;
  const fresh = sorted.some((s) => isFresh(s.type, s.signalDate, today));
  const signalState: SignalState = !sorted.length ? "none" : fresh ? "fresh" : "stale";
  return { ...p, signals: sorted, latest, signalState, ...qualScore(p.qualifier, fresh) };
}

export interface ItEvent {
  id: string;
  prospectId: string;
  by: string;
  kind: "created" | "stage" | "assign" | "signal" | "comment" | "edit";
  fromStage: ItStage | null;
  toStage: ItStage | null;
  note: string;
  createdAt: string;
}

/** What the prospect form edits. Owner, stage, qualifier and signals change through their own Store methods. */
export interface ItProspectInput {
  segment: Segment;
  company: string;
  companyDomain: string;
  websiteUrl: string;
  linkedinUrl: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
  city: string;
  region: string;
  country: Country;
  teamSize: string;
  notes: string;
  mapsUrl?: string;
  mapsCategory?: string;
  rating?: number | null;
  reviewCount?: number | null;
}

export interface ItSignalInput {
  type: SignalType;
  url: string;
  quote: string;
  signalDate: string | null;
  source: string;
}

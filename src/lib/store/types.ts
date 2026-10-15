// The shapes of every file under team/. Lead, kit and event fields keep the column names of the old tables,
// so moving to a server database later is a copy, not a redesign. Fields added in Phase 13 are camelCase.
import type { Role } from "@/lib/auth/roles";
import type { CheckField } from "@/lib/leads/checks";
import type { Channel, Stage } from "@/lib/leads/stages";

export const SCHEMA_VERSION = 1;

export type UserStatus = "active" | "suspended" | "disabled";

/** team/users/<username>.json: written by admins. Never holds a plain-text password. */
export interface UserFile {
  username: string;
  fullName: string;
  role: Role;
  /** A team id from teams.json, or null. */
  team: string | null;
  status: UserStatus;
  statusReason: string;
  /** YYYY-MM-DD. A suspension lifts itself when this date passes. */
  suspendedUntil: string | null;
  /** bcrypt hash of the temporary password. */
  tempPasswordHash: string;
  /** Bumped by every admin change. A session signed at an older rev ends. */
  rev: number;
  /** The rev at which the temporary password was last set (creation or reset). The person's own password works while profile.basedOnRev equals it. */
  pwRev: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** team/data/<username>/profile.json: written only by that person's app. */
export interface Profile {
  defaultDevice: "desktop" | "mobile";
  /** bcrypt hash of the person's own password. */
  passwordHash: string | null;
  /** The user file's pwRev when the own password was set. */
  basedOnRev: number | null;
  /** Per-person Outreach Health items (Prompt D). */
  outreachHealth?: Record<string, unknown>;
}

export interface Team { id: string; name: string; managers: string[] }
/** team/teams.json */
export interface TeamsFile { teams: Team[] }

export interface Workspace {
  name: string;
  studio: string;
  demoDomain: string;
  basedLine: string;
  features: { leadFinder: boolean; softwareTrack: boolean };
  /** Exchange rates for kits built in Canada and the UAE (1 USD = n). Absent means the planning defaults. */
  markets?: { rates: { CAD: number; AED: number } };
  /** Workspace-level Outreach Health (Prompt D). */
  outreachHealth?: Record<string, unknown>;
}

export type KitStatus = "draft" | "active" | "paused" | "archived";
export const KIT_STATUSES: KitStatus[] = ["draft", "active", "paused", "archived"];

/** team/data/<u>/kits/<id>.json: inputs only. The kit is rebuilt on view. */
export interface KitRecord {
  id: string;
  owner: string;
  title: string;
  status: KitStatus;
  category: string;
  device: "desktop" | "mobile";
  state: string;
  city: string;
  city_is_free: boolean;
  direction: string;
  /** UAE kits: the prospect site's language (en, ar, bi). Absent on older kits and outside the UAE. */
  site_lang?: string;
  created_at: string;
  updated_at: string;
}

export type LeadChecks = Record<CheckField, boolean>;

/** team/data/<u>/leads/<id>.json: the 28 columns' fields and the ten checks. Score and tier are computed, never stored. */
export interface Lead extends LeadChecks {
  id: string;
  owner: string;
  /** Who works the lead. A BD's own lead is assigned to the BD; a researcher's lead is null until assigned. */
  assignedTo: string | null;
  /** Set when an assignment was accepted: where this copy came from. */
  sourceRef: { owner: string; id: string } | null;
  kit_id: string | null;
  date_sourced: string;
  business_name: string;
  owner_first_name: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  /** The lead's WhatsApp number (digits with country code) or wa.me link, "" when none. Absent on leads saved before the field existed. */
  whatsapp?: string;
  email: string;
  instagram_handle: string;
  facebook_page: string;
  google_maps_url: string;
  website_found: boolean | null;
  website_url: string;
  site_verdict: string;
  google_review_count: number | null;
  google_rating: number | null;
  followers: number | null;
  last_post_date: string | null;
  demo_url: string;
  demo_built_date: string | null;
  first_contact_date: string | null;
  channel: Channel | null;
  replied: boolean;
  stage: Stage;
  next_action_date: string | null;
  notes: string;
  sequence_step: number;
  created_at: string;
  updated_at: string;
}

/** A lead with its computed score and tier. */
export type LeadView = Lead & { score: number; tier: "hot" | "warm" | "skip" };

export type EventKind = "stage_change" | "touch" | "comment";

/** One line of events.jsonl. Append-only. */
export interface LeadEvent {
  id: string;
  /** Whose folder the lead is in. */
  lead_owner: string;
  lead_id: string;
  /** Who wrote the event. */
  by: string;
  kind: EventKind;
  from_stage: Stage | null;
  to_stage: Stage | null;
  channel: string | null;
  occurred_on: string;
  note: string;
  created_at: string;
}

/** One line of assignments.jsonl, in the folder of the manager or admin who made it. */
export interface Assignment {
  id: string;
  kind: "assign" | "handover";
  by: string;
  /** The lead: its owner's username and its id. */
  leadOwner: string;
  leadId: string;
  business: string;
  to: string;
  at: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

/** team/data/<u>/playbook.json */
export interface PlaybookFile {
  /** Section id -> ISO time first read. */
  reads: Record<string, string>;
  /** Sections this person marked required. A manager's apply to their team; an admin's to everyone. */
  required: string[];
}

/** team/data/<u>/approvals.json: content review records, kept by the owner. The kit files themselves are never edited at runtime. */
export interface ApprovalRecord { id: string; kind: "category-kit" | "segment"; fileId: string; version: string; approvedAt: string; note: string }
export interface ApprovalsFile { approvals: ApprovalRecord[] }

export interface FinderBusiness {
  id: string;
  placeKey: string;
  scrapedOn: string;
  scrapedAt: string;
  runId: string | null;
  query: string;
  category: string;
  city: string;
  state: string;
  name: string;
  phone: string;
  address: string;
  mapsCategory: string;
  rating: number | null;
  reviewCount: number | null;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  otherLinks: { label: string; url: string }[];
  mapsUrl: string;
  /** Absent on lines written before the finder kept businesses with a website: read as false and "". */
  hasWebsite?: boolean;
  websiteUrl?: string;
  /** Absent on lines written before the finder read WhatsApp links: read as "". */
  whatsapp?: string;
}

/** Lines of finder/businesses.jsonl are either a business or a record that it was moved to leads. */
export type FinderLine =
  | ({ kind: "business" } & FinderBusiness)
  | { kind: "moved"; id: string; leadId: string; at: string };

export type FinderRunLine =
  | { kind: "start"; id: string; at: string; query: string; category: string; city: string; state: string; limit: number }
  | { kind: "finish"; id: string; at: string; found: number; checked: number; skippedHasWebsite: number; skippedDuplicate: number; saved: number; stopReason: string };

/** The signed-in person, as the Store sees them. */
export interface Actor { username: string; role: Role; team: string | null }

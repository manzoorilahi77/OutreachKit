import { CHECK_FIELDS, type CheckField } from "@/lib/leads/checks";
import type { LeadInput } from "@/lib/leads/form";
import { scoreOf, verdictOf } from "@/lib/leads/score";
import type { Stage } from "@/lib/leads/stages";
import type { Lead, LeadView } from "./types";

/** Score and tier are computed, never stored (they were generated columns in the old database). */
export function toView(l: Lead): LeadView {
  const score = scoreOf(CHECK_FIELDS.map((f) => !!l[f]));
  return { ...l, score, tier: verdictOf(score) };
}

/** What createLead takes: the lead form, or an imported CSV row. */
export type NewLeadInput = Omit<LeadInput, "checks"> & {
  checks: Partial<Record<CheckField | string, boolean>>;
  replied?: boolean;
  stage?: Stage;
  next_action_date?: string | null;
  kit_id?: string | null;
};

export function buildLead(i: NewLeadInput, o: { id: string; owner: string; assignedTo: string | null; today: string; nowIso: string; sourceRef?: Lead["sourceRef"] }): Lead {
  const checks = Object.fromEntries(CHECK_FIELDS.map((f) => [f, i.checks[f] === true])) as Record<CheckField, boolean>;
  return {
    id: o.id, owner: o.owner, assignedTo: o.assignedTo, sourceRef: o.sourceRef ?? null, kit_id: i.kit_id ?? null,
    date_sourced: i.date_sourced ?? o.today,
    business_name: i.business_name, owner_first_name: i.owner_first_name, category: i.category, city: i.city, state: i.state,
    phone: i.phone, whatsapp: i.whatsapp ?? "", email: i.email, instagram_handle: i.instagram_handle, facebook_page: i.facebook_page, google_maps_url: i.google_maps_url,
    website_found: i.website_found, website_url: i.website_url, site_verdict: i.site_verdict,
    google_review_count: i.google_review_count, google_rating: i.google_rating, followers: i.followers, last_post_date: i.last_post_date,
    demo_url: i.demo_url, demo_built_date: i.demo_built_date, first_contact_date: i.first_contact_date, channel: i.channel,
    replied: i.replied ?? false, stage: i.stage ?? "sourced", next_action_date: i.next_action_date ?? null, notes: i.notes,
    sequence_step: 0, created_at: o.nowIso, updated_at: o.nowIso,
    ...checks,
  };
}

/** The fields a lead form edits. Everything else (stage, sequence, ownership) changes only through the Store's own methods. */
const EDITABLE = [
  "business_name", "owner_first_name", "category", "city", "state", "phone", "whatsapp", "email", "instagram_handle", "facebook_page", "google_maps_url",
  "website_found", "website_url", "site_verdict", "google_review_count", "google_rating", "followers", "last_post_date",
  "demo_url", "demo_built_date", "first_contact_date", "channel", "notes", "date_sourced",
] as const;
/** The outreach fields a researcher never changes: they contact no one. */
const OUTREACH = ["demo_url", "demo_built_date", "first_contact_date", "channel"] as const;

export function applyForm(lead: Lead, i: NewLeadInput, opts: { withOutreach: boolean; nowIso: string }): Lead {
  const next: Lead = { ...lead, updated_at: opts.nowIso };
  const n = next as unknown as Record<string, unknown>;
  const src = i as unknown as Record<string, unknown>;
  for (const k of EDITABLE) {
    if (!opts.withOutreach && (OUTREACH as readonly string[]).includes(k)) continue;
    if ((k === "date_sourced" || k === "whatsapp") && src[k] === undefined) continue;
    n[k] = src[k];
  }
  for (const f of CHECK_FIELDS) next[f] = i.checks[f] === true;
  return next;
}

// Saved business -> the lead form fields. Move to Leads feeds this through parseLeadForm, the same validator as
// src/app/leads/actions.ts, so a moved row is held to exactly the rules of a lead typed in by hand.
import { instagramHandle } from "./links";
import type { BusinessRow } from "./types";

/** The lead's notes: what the leads table has no column for. */
export function leadNotes(b: BusinessRow, today: string): string {
  const lines: string[] = [];
  if (b.address) lines.push(`Address: ${b.address}`);
  if (b.mapsCategory) lines.push(`Maps category: ${b.mapsCategory}`);
  if (b.instagramUrl && !instagramHandle(b.instagramUrl)) lines.push(`Instagram: ${b.instagramUrl}`);
  for (const l of b.otherLinks) lines.push(`${l.label}: ${l.url}`);
  lines.push(`Found with the Google Maps lead finder on ${today}${b.hasWebsite ? " (the listing shows a website)." : " (no website shown on the listing)."}`);
  return lines.join("\n");
}

/**
 * The fields createLead's form would post for this business. With no website, website_found is "no" and the no-real-website
 * check is on; with one, website_found is "yes", the address goes in website_url and no check is ticked.
 */
export function businessToLeadFields(b: BusinessRow, today: string): Record<string, string> {
  return {
    date_sourced: today,
    business_name: b.name,
    category: b.category,
    city: b.city,
    state: b.state,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    instagram_handle: instagramHandle(b.instagramUrl),
    facebook_page: b.facebookUrl,
    google_maps_url: b.mapsUrl,
    google_rating: b.rating === null ? "" : String(b.rating),
    google_review_count: b.reviewCount === null ? "" : String(b.reviewCount),
    website_found: b.hasWebsite ? "yes" : "no",
    website_url: b.hasWebsite ? b.websiteUrl : "",
    ...(b.hasWebsite ? {} : { check_no_real_website: "on" }),
    notes: leadNotes(b, today),
  };
}

export function businessToLeadForm(b: BusinessRow, today: string): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(businessToLeadFields(b, today))) fd.set(k, v);
  return fd;
}

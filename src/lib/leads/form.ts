import { normalizeWhatsapp } from "./whatsapp";
import { isRegion } from "@/lib/market/regions";
import type { Channel } from "./stages";
import { CHECK_FIELDS } from "./checks";

type Ok<T> = { ok: true; value: T };
type Bad = { ok: false; error: string };

const text = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const date = (fd: FormData, k: string): string | null | undefined => {
  const v = text(fd, k, 10);
  if (!v) return null;
  return ISO.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
};
const int = (fd: FormData, k: string): number | null | undefined => {
  const v = text(fd, k, 12);
  if (!v) return null;
  return /^\d+$/.test(v) ? Number(v) : undefined;
};

export interface LeadInput {
  date_sourced?: string;
  business_name: string; owner_first_name: string; category: string; city: string; state: string;
  phone: string; email: string; instagram_handle: string; facebook_page: string; google_maps_url: string;
  /** WhatsApp number (digits) or wa.me link. Optional so imported rows and older callers need not set it. */
  whatsapp?: string;
  website_found: boolean | null; website_url: string; site_verdict: string;
  google_review_count: number | null; google_rating: number | null; followers: number | null; last_post_date: string | null;
  demo_url: string; demo_built_date: string | null; first_contact_date: string | null; channel: Channel | null; notes: string;
  checks: Record<string, boolean>;
}

/** Reads and checks the lead form. Returns the row fields or the first problem, in plain words. */
export function parseLeadForm(fd: FormData): Ok<LeadInput> | Bad {
  const business_name = text(fd, "business_name", 200);
  if (!business_name) return { ok: false, error: "Add the business name." };

  const state = text(fd, "state", 3).toUpperCase();
  if (state && !isRegion(state)) return { ok: false, error: "That region code isn't recognised. Use a US state or Canadian province code (TX, ON) or an emirate code (DXB, AUH)." };

  const dates = { date_sourced: date(fd, "date_sourced"), last_post_date: date(fd, "last_post_date"), demo_built_date: date(fd, "demo_built_date"), first_contact_date: date(fd, "first_contact_date") };
  for (const [k, v] of Object.entries(dates)) if (v === undefined) return { ok: false, error: `Check the date in ${k.replace(/_/g, " ")}.` };

  const waRaw = text(fd, "whatsapp", 300);
  const whatsapp = normalizeWhatsapp(waRaw);
  if (waRaw && !whatsapp) return { ok: false, error: "The WhatsApp number doesn't look right. Use digits with the country code, like +1 214 555 0147, or a wa.me link." };

  const nums = { google_review_count: int(fd, "google_review_count"), followers: int(fd, "followers") };
  for (const [k, v] of Object.entries(nums)) if (v === undefined) return { ok: false, error: `${k.replace(/_/g, " ")} must be a whole number.` };

  const ratingRaw = text(fd, "google_rating", 4);
  const rating = ratingRaw === "" ? null : Number(ratingRaw);
  if (rating !== null && !(rating >= 0 && rating <= 5)) return { ok: false, error: "The Google rating is between 0 and 5." };

  const found = text(fd, "website_found", 3);
  const channelRaw = text(fd, "channel", 20);
  const channel = (["instagram_dm", "facebook_dm", "whatsapp", "call", "email", "other"] as const).find((c) => c === channelRaw) ?? null;

  const checks: Record<string, boolean> = {};
  for (const f of CHECK_FIELDS) checks[f] = fd.get(f) === "on";

  return {
    ok: true,
    value: {
      ...(dates.date_sourced ? { date_sourced: dates.date_sourced } : {}),
      business_name, owner_first_name: text(fd, "owner_first_name", 100), category: text(fd, "category", 120), city: text(fd, "city", 120), state,
      phone: text(fd, "phone", 60), ...(fd.has("whatsapp") ? { whatsapp } : {}), email: text(fd, "email", 200), instagram_handle: text(fd, "instagram_handle", 100),
      facebook_page: text(fd, "facebook_page", 300), google_maps_url: text(fd, "google_maps_url", 500),
      website_found: found === "yes" ? true : found === "no" ? false : null, website_url: text(fd, "website_url", 500), site_verdict: text(fd, "site_verdict", 300),
      google_review_count: nums.google_review_count ?? null, google_rating: rating, followers: nums.followers ?? null,
      last_post_date: dates.last_post_date ?? null, demo_url: text(fd, "demo_url", 500), demo_built_date: dates.demo_built_date ?? null,
      first_contact_date: dates.first_contact_date ?? null, channel, notes: text(fd, "notes", 4000), checks,
    },
  };
}

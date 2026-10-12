export interface OtherLink { label: string; url: string }

/** What one opened Maps listing shows. */
export interface ParsedListing {
  name: string;
  phone: string;
  address: string;
  /** Maps' own category label, e.g. "Roofing contractor". */
  mapsCategory: string;
  rating: number | null;
  reviewCount: number | null;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  otherLinks: OtherLink[];
  /** The listing links to a website of the business: a Website row, or a booking link on the business's own domain. */
  hasWebsite: boolean;
  websiteUrl: string;
  websiteSource: "website" | "booking-link" | null;
}

/** One saved business, as the UI and the Move to Leads action see it. */
export interface BusinessRow {
  id: string;
  placeKey: string;
  scrapedOn: string;
  scrapedAt: string;
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
  otherLinks: OtherLink[];
  mapsUrl: string;
  movedLeadId: string | null;
}

export type StopCode =
  | "limit_reached" | "end_of_results" | "no_results" | "captcha" | "consent" | "blocked"
  | "cancelled" | "day_changed" | "unresponsive" | "error";

export interface Counters {
  /** Listings seen in the results. */
  found: number;
  /** Listings looked at: opened, skipped from their card, or recognised as already saved. */
  checked: number;
  /** Opened listings that showed no website. */
  noWebsite: number;
  saved: number;
  skippedHasWebsite: number;
  skippedDuplicate: number;
  /** Opened listings the parser could not read, or that failed to load. */
  unreadable: number;
}

export interface RunInfo { query: string; limit: number; day: string; savedToday: number }

export type RunEvent =
  | { type: "start"; runId: string; info: RunInfo }
  | { type: "status"; message: string }
  | ({ type: "progress"; savedToday: number; limit: number; message: string } & Counters)
  | { type: "saved"; business: BusinessRow }
  /** The run could not start or crashed outside the scraper (for example the database is down). */
  | { type: "failed"; message: string }
  | ({ type: "done"; runId: string; stopCode: StopCode; stopReason: string; savedToday: number; limit: number } & Counters);

export const emptyCounters = (): Counters => ({ found: 0, checked: 0, noWebsite: 0, saved: 0, skippedHasWebsite: 0, skippedDuplicate: 0, unreadable: 0 });

/** "Checked 23 · no website 9 · saved 7 · skipped 14 with a website" */
export function progressLine(c: Counters): string {
  const parts = [`Checked ${c.checked}`, `no website ${c.noWebsite}`, `saved ${c.saved}`, `skipped ${c.skippedHasWebsite} with a website`];
  if (c.skippedDuplicate) parts.push(`${c.skippedDuplicate} already saved`);
  if (c.unreadable) parts.push(`${c.unreadable} unreadable`);
  return parts.join(" · ");
}

import { COLS } from "@/data";
import { channelLabel, stageLabel, type Channel, type Stage } from "./stages";

export interface LeadRow {
  date_sourced: string; business_name: string; owner_first_name: string; category: string; city: string; state: string;
  phone: string; email: string; instagram_handle: string; facebook_page: string; google_maps_url: string;
  website_found: boolean | null; website_url: string; site_verdict: string; google_review_count: number | null;
  google_rating: number | null; followers: number | null; last_post_date: string | null; score: number;
  tier: "hot" | "warm" | "skip"; demo_url: string; demo_built_date: string | null; first_contact_date: string | null;
  channel: Channel | null; replied: boolean; stage: Stage; next_action_date: string | null; notes: string;
}

const TIER = { hot: "Hot", warm: "Warm", skip: "Skip" } as const;
const yn = (v: boolean | null) => (v === null ? "" : v ? "Yes" : "No");
const s = (v: string | number | null) => (v === null ? "" : String(v));

/** The 28 columns, in the order of COLS (the header row the original copies for Google Sheets). */
export function leadCells(l: LeadRow): string[] {
  return [
    l.date_sourced, l.business_name, l.owner_first_name, l.category, l.city, l.state, l.phone, l.email,
    l.instagram_handle, l.facebook_page, l.google_maps_url, yn(l.website_found), l.website_url, l.site_verdict,
    s(l.google_review_count), s(l.google_rating), s(l.followers), s(l.last_post_date), s(l.score), TIER[l.tier],
    l.demo_url, s(l.demo_built_date), s(l.first_contact_date), channelLabel(l.channel), yn(l.replied), stageLabel(l.stage),
    s(l.next_action_date), l.notes,
  ];
}

/** Stops a spreadsheet reading text as a formula. Phone-style values such as "+1 512 555 0100" are left alone. */
export function safeCell(v: string): string {
  if (/^[=@\t\r]/.test(v)) return "'" + v;
  if (/^[+-]/.test(v) && !/^[+-]?[\d\s().-]+$/.test(v)) return "'" + v;
  return v;
}

export function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

export const CSV_HEADER = COLS.map(csvField).join(",");

export function leadsToCsv(rows: LeadRow[]): string {
  return [CSV_HEADER, ...rows.map((r) => leadCells(r).map((c) => csvField(safeCell(c))).join(","))].join("\r\n") + "\r\n";
}

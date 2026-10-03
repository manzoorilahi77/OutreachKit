// Leads CSV import: the reverse of leadCells (csv.ts). Pure, so the same code previews in the browser
// flow and re-checks on the server before anything is inserted.
import { COLS, STATES } from "@/data";
import { CHECK_LABELS, type CheckField } from "./checks";
import { CHANNELS, STAGES, type Channel, type Stage } from "./stages";

export const IMPORT_CAP = 200;

/** RFC 4180: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { f += '"'; i++; }
      else if (ch === '"') q = false;
      else f += ch;
    } else if (ch === '"' && f === "") q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(f); f = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else f += ch;
  }
  row.push(f);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export type HeaderCheck = { ok: true; checks: (CheckField | null)[] } | { ok: false; error: string };

/** The header must start with the 28 columns of CSV_HEADER, then up to ten scorer columns named exactly as the scorer's labels. */
export function checkHeader(header: string[]): HeaderCheck {
  const h = header.map((x) => x.trim());
  for (let i = 0; i < COLS.length; i++) {
    if (h[i] === undefined) return { ok: false, error: `The header stops after ${i} columns. Column ${i + 1} should be "${COLS[i]}".` };
    if (h[i] !== COLS[i]) return { ok: false, error: `Column ${i + 1} is "${h[i]}". It should be "${COLS[i]}".` };
  }
  const extra = h.slice(COLS.length);
  if (extra.length > CHECK_LABELS.length) return { ok: false, error: `There are ${extra.length} columns after Notes. At most ${CHECK_LABELS.length} scorer columns are allowed.` };
  const seen = new Set<string>();
  const checks: (CheckField | null)[] = [];
  for (const [j, label] of extra.entries()) {
    const c = CHECK_LABELS.find((x) => x.label === label);
    if (!c) return { ok: false, error: `Column ${COLS.length + j + 1} is "${label}". After Notes, only the scorer's check labels are allowed, for example "${CHECK_LABELS[0]!.label}".` };
    if (seen.has(c.field)) return { ok: false, error: `The scorer column "${label}" appears twice.` };
    seen.add(c.field);
    checks.push(c.field);
  }
  return { ok: true, checks };
}

export interface ImportedLead {
  date_sourced?: string;
  business_name: string; owner_first_name: string; category: string; city: string; state: string;
  phone: string; email: string; instagram_handle: string; facebook_page: string; google_maps_url: string;
  website_found: boolean | null; website_url: string; site_verdict: string;
  google_review_count: number | null; google_rating: number | null; followers: number | null; last_post_date: string | null;
  demo_url: string; demo_built_date: string | null; first_contact_date: string | null; channel: Channel | null;
  replied: boolean; stage: Stage; next_action_date: string | null; notes: string;
  checks: Partial<Record<CheckField, boolean>>;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** Undo safeCell: a leading apostrophe that guarded a formula character. */
const unsafe = (v: string) => (/^'[=@+\-\t\r]/.test(v) ? v.slice(1) : v).trim();

export function parseRow(cells: string[], checks: (CheckField | null)[]): { ok: true; lead: ImportedLead } | { ok: false; error: string } {
  const v = (i: number) => unsafe(cells[i] ?? "");
  const errs: string[] = [];
  const date = (i: number) => {
    const s = v(i);
    if (!s) return null;
    if (ISO.test(s) && !Number.isNaN(Date.parse(s))) return s;
    errs.push(`${COLS[i]} "${s}" is not a YYYY-MM-DD date`);
    return null;
  };
  const int = (i: number) => {
    const s = v(i).replace(/,/g, "");
    if (!s) return null;
    if (/^\d+$/.test(s)) return Number(s);
    errs.push(`${COLS[i]} "${v(i)}" is not a whole number`);
    return null;
  };
  const yn = (i: number): boolean | null => {
    const s = v(i).toLowerCase();
    if (!s) return null;
    if (s === "yes") return true;
    if (s === "no") return false;
    errs.push(`${COLS[i]} "${v(i)}" should be Yes or No`);
    return null;
  };

  const business_name = v(1);
  if (!business_name) errs.push("Business name is empty");
  const state = v(5).toUpperCase();
  if (state && !(state in STATES)) errs.push(`State "${v(5)}" is not a two-letter US state code`);
  const ratingRaw = v(15);
  const rating = ratingRaw === "" ? null : Number(ratingRaw);
  if (rating !== null && !(rating >= 0 && rating <= 5)) errs.push(`Google rating "${ratingRaw}" is not between 0 and 5`);
  const channelLabel = v(23);
  const channel = channelLabel ? CHANNELS.find((c) => c.label.toLowerCase() === channelLabel.toLowerCase())?.value ?? null : null;
  if (channelLabel && !channel) errs.push(`Channel "${channelLabel}" is not one of ${CHANNELS.map((c) => c.label).join(", ")}`);
  const stageLabel = v(25);
  const stage = stageLabel ? STAGES.find((s) => s.label.toLowerCase() === stageLabel.toLowerCase())?.value : "sourced";
  if (!stage) errs.push(`Stage "${stageLabel}" is not one of ${STAGES.map((s) => s.label).join(", ")}`);

  const checkValues: Partial<Record<CheckField, boolean>> = {};
  checks.forEach((field, j) => {
    if (!field) return;
    const s = v(COLS.length + j).toLowerCase();
    if (s === "yes") checkValues[field] = true;
    else if (s === "no" || s === "") checkValues[field] = false;
    else errs.push(`"${CHECK_LABELS.find((c) => c.field === field)!.label}" should be Yes or No`);
  });

  const lead: ImportedLead = {
    business_name: business_name.slice(0, 200), owner_first_name: v(2).slice(0, 100), category: v(3).slice(0, 120), city: v(4).slice(0, 120), state,
    phone: v(6).slice(0, 60), email: v(7).slice(0, 200), instagram_handle: v(8).slice(0, 100), facebook_page: v(9).slice(0, 300),
    google_maps_url: v(10).slice(0, 500), website_found: yn(11), website_url: v(12).slice(0, 500), site_verdict: v(13).slice(0, 300),
    google_review_count: int(14), google_rating: rating, followers: int(16), last_post_date: date(17),
    // 18 Score /10 and 19 Tier are ignored: the database computes both from the check columns.
    demo_url: v(20).slice(0, 500), demo_built_date: date(21), first_contact_date: date(22), channel,
    replied: yn(24) ?? false, stage: stage ?? "sourced", next_action_date: date(26), notes: v(27).slice(0, 4000),
    checks: checkValues,
  };
  const sourced = date(0);
  if (sourced) lead.date_sourced = sourced;
  return errs.length ? { ok: false, error: errs.join("; ") } : { ok: true, lead };
}

/** The keys a lead is matched on: email, phone digits only, Google Maps URL. */
export function dedupeKeys(l: { email: string; phone: string; google_maps_url: string }): string[] {
  const keys: string[] = [];
  const email = l.email.trim().toLowerCase();
  if (email) keys.push("e:" + email);
  const digits = l.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  if (digits.length >= 7) keys.push("p:" + digits);
  const maps = l.google_maps_url.trim().replace(/\/+$/, "").toLowerCase();
  if (maps) keys.push("m:" + maps);
  return keys;
}

export interface ImportPreview {
  ok: boolean;
  /** A header problem, a cap problem or an empty file. Nothing imports. */
  error?: string;
  add: { line: number; lead: ImportedLead }[];
  duplicates: { line: number; business: string; matchedOn: string }[];
  errors: { line: number; business: string; error: string }[];
}

const MATCH = { e: "email", p: "phone", m: "Google Maps URL" } as const;

/** Header check, row parsing, the 200-row cap and dedupe against existing leads and earlier rows. */
export function previewImport(text: string, existing: { email: string; phone: string; google_maps_url: string }[]): ImportPreview {
  const empty: ImportPreview = { ok: false, add: [], duplicates: [], errors: [] };
  const rows = parseCsv(text);
  if (!rows.length) return { ...empty, error: "The file is empty." };
  const header = checkHeader(rows[0]!);
  if (!header.ok) return { ...empty, error: header.error };
  const body = rows.slice(1);
  if (!body.length) return { ...empty, error: "The file has a header but no rows." };
  if (body.length > IMPORT_CAP) return { ...empty, error: `The file has ${body.length} rows. Import at most ${IMPORT_CAP} at a time.` };

  const seen = new Set(existing.flatMap(dedupeKeys));
  const out: ImportPreview = { ok: true, add: [], duplicates: [], errors: [] };
  body.forEach((cells, i) => {
    const line = i + 2;
    const r = parseRow(cells, header.checks);
    if (!r.ok) { out.errors.push({ line, business: unsafe(cells[1] ?? ""), error: r.error }); return; }
    const hit = dedupeKeys(r.lead).find((k) => seen.has(k));
    if (hit) { out.duplicates.push({ line, business: r.lead.business_name, matchedOn: MATCH[hit[0] as keyof typeof MATCH] }); return; }
    dedupeKeys(r.lead).forEach((k) => seen.add(k));
    out.add.push({ line, lead: r.lead });
  });
  return out;
}

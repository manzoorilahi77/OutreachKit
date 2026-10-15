// The signals inbox's first guess: reads a pasted job post, project post or tender and pulls out what it can.
// Plain text rules, no network and no AI. A person checks every field before anything is saved.
import { AE_REGIONS, CA_REGIONS, countryOf, isRegion, regionName, type Country, type RegionCode } from "@/lib/market/regions";
import { companyDomain, domainOf } from "./keys";
import type { SignalType } from "./model";

export interface ParsedSignal {
  company: string;
  /** The post's headline: a role or the project's title. */
  headline: string;
  type: SignalType;
  signalDate: string | null;
  city: string;
  region: string;
  country: Country | null;
  remote: boolean;
  companyDomain: string;
  email: string;
  source: string;
  quote: string;
}

const SOURCES: [host: string, name: string][] = [
  ["linkedin.com", "LinkedIn"], ["indeed.com", "Indeed"], ["upwork.com", "Upwork"], ["wellfound.com", "Wellfound"], ["angel.co", "Wellfound"],
  ["clutch.co", "Clutch"], ["reddit.com", "Reddit"], ["sam.gov", "SAM.gov"], ["canadabuys.canada.ca", "CanadaBuys"], ["ycombinator.com", "Hacker News"],
  ["remoteok.com", "Remote OK"], ["weworkremotely.com", "We Work Remotely"], ["greenhouse.io", "Greenhouse"], ["lever.co", "Lever"],
  ["glassdoor.com", "Glassdoor"], ["contra.com", "Contra"], ["facebook.com", "Facebook"], ["x.com", "X"], ["twitter.com", "X"], ["dubai.gov.ae", "Dubai eSupply"],
  ["adgpg.gov.ae", "Abu Dhabi procurement"], ["socrata.com", "Open data"],
];

/** "LinkedIn" for a linkedin.com link, the bare domain for anything else, "" without a link. */
export function sourceOf(url: string): string {
  const d = domainOf(url);
  if (!d) return "";
  return SOURCES.find(([h]) => d === h || d.endsWith("." + h))?.[1] ?? d;
}

const TYPE_RULES: [SignalType, RegExp][] = [
  ["tender", /\b(rfp|rfq|rfi|request for (proposals?|quotations?|information)|tender|solicitation|invitation to bid|bid (closing|due)|closing date|procurement)\b/i],
  ["ai_rescue", /\b(vibe[- ]?cod\w*|built (it )?(with|using) (ai|cursor|lovable|bolt|replit|v0|chatgpt|claude)|ai[- ](generated|built) (code|app)|ai (app )?builder)\b/i],
  ["looking_for", /\b(looking for|need|seeking|recommend(ations?)?( for)?|anyone know)( an?| some| good)? (developer|dev shop|dev team|development (agency|company|partner)|agency|programmer|web designer|freelancer|app developer)\b/i],
  ["project_post", /\b(portfolio|commercials|send (us )?(your )?(quote|proposal|rates?)|fixed[- ]price|hourly range|proposals?|budget\s*[:$]|share your (work|rates))\b/i],
  ["it_role", /\b(it support|help ?desk|service desk|systems? administrator|sysadmin|network administrator|data entry|operations (admin|administrator|coordinator|assistant)|office (admin|administrator|manager))\b/i],
  ["site_launch", /\b(just launched|we launched|new website for|went live|case study|proud to (launch|unveil))\b/i],
  ["dev_role", /\b(developer|engineer|programmer|full[- ]?stack|front[- ]?end|back[- ]?end|devops|react|node(\.js)?|php|wordpress|laravel|python|software)\b/i],
];

export function guessType(text: string, url = ""): SignalType {
  for (const [type, re] of TYPE_RULES) if (re.test(text)) return type;
  return /linkedin\.com\/jobs|indeed\.|greenhouse\.io|lever\.co|wellfound\.|remoteok\.|weworkremotely\./i.test(url) ? "dev_role" : "looking_for";
}

const lines = (text: string) => text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

const LABELED = /^(?:company|company name|organi[sz]ation|employer|agency|buyer|client|issuing (?:organi[sz]ation|agency|office)|department|hiring company)\s*[:\-–—]\s*(.{2,120})$/i;
const NOT_COMPANY = /^(remote|hybrid|on[- ]?site|full[- ]?time|part[- ]?time|contract|\d+\s+(day|week|month|hour)s?\s+ago|today|yesterday|easy apply|apply|save|share|promoted|actively hiring)$/i;

const cleanCompany = (s: string) => s.replace(/\s*\((?:remote|hybrid|on-?site)\)\s*$/i, "").replace(/[.,;:|·•\-–—\s]+$/, "").trim();

export function guessCompany(text: string): string {
  const ls = lines(text);
  for (const l of ls) {
    const m = LABELED.exec(l);
    if (m) return cleanCompany(m[1]!);
  }
  for (const l of ls.slice(0, 12)) {
    const m = /^(.{2,80}?) (?:is|are) (?:hiring|looking for|seeking)\b/i.exec(l);
    if (m && !/^(we|i|our team|my company)$/i.test(m[1]!)) return cleanCompany(m[1]!);
  }
  // LinkedIn and similar boards: "Acme Corp · Austin, TX (Remote)".
  for (const l of ls.slice(0, 6)) {
    if (!/ [·•|] /.test(l)) continue;
    const first = cleanCompany(l.split(/ [·•|] /)[0]!);
    if (first && !NOT_COMPANY.test(first) && !/\d+ (applicants?|days?|weeks?|months?)/i.test(first) && first.length <= 80) return first;
  }
  // "Senior React Developer at Acme Corp".
  for (const l of ls.slice(0, 3)) {
    const m = /\b(?:at|@|with|for) ([A-Z0-9][\w&.,'’ -]{1,60}?)(?:\s*(?:[,(|·•]|\s[-–—]\s|\bin\b|$))/.exec(l);
    if (m && !NOT_COMPANY.test(m[1]!.trim())) return cleanCompany(m[1]!);
  }
  return "";
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number): string | null => {
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};
const minusDays = (today: string, n: number) => new Date(Date.parse(today + "T00:00:00Z") - n * 86_400_000).toISOString().slice(0, 10);

/** The day the post went up: "posted 3 weeks ago", "Oct 3, 2026", "2026-10-03", "10/03/2026" (US order). Prefers a date after "posted", "published" or "issued". */
export function guessDate(text: string, today: string): string | null {
  const rel = /\b(?:(?:posted|published|reposted|listed)\s+)?(\d{1,3}|an?|one)\s+(hour|day|week|month)s?\s+ago\b/i.exec(text);
  const n = (v: string) => (/^(an?|one)$/i.test(v) ? 1 : Number(v));
  const candidates: { at: number; date: string | null; strong: boolean }[] = [];
  if (rel) {
    const k = rel[2]!.toLowerCase(), v = n(rel[1]!);
    candidates.push({ at: rel.index, date: minusDays(today, k === "hour" ? 0 : k === "day" ? v : k === "week" ? v * 7 : v * 30), strong: true });
  }
  const yest = /\b(yesterday)\b/i.exec(text);
  if (yest) candidates.push({ at: yest.index, date: minusDays(today, 1), strong: false });
  const now = /\b(posted today|just now|just posted)\b/i.exec(text);
  if (now) candidates.push({ at: now.index, date: today, strong: true });
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) candidates.push({ at: m.index!, date: iso(+m[1]!, +m[2]!, +m[3]!), strong: false });
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)) {
    const mi = MONTHS.indexOf(m[1]!.slice(0, 3).toLowerCase());
    if (mi >= 0) candidates.push({ at: m.index!, date: iso(+m[3]!, mi + 1, +m[2]!), strong: false });
  }
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g)) {
    const mi = MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase());
    if (mi >= 0) candidates.push({ at: m.index!, date: iso(+m[3]!, mi + 1, +m[1]!), strong: false });
  }
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) candidates.push({ at: m.index!, date: iso(+m[3]!, +m[1]!, +m[2]!), strong: false });
  const valid = candidates.filter((c) => c.date && c.date <= today);
  if (!valid.length) return null;
  const labelled = valid.find((c) => /(posted|published|issued|listed|date)[^\n]{0,20}$/i.test(text.slice(Math.max(0, c.at - 24), c.at)));
  return (labelled ?? valid.find((c) => c.strong) ?? valid.sort((a, b) => a.at - b.at)[0])!.date;
}

const AE_NAMES: [RegExp, RegionCode][] = (Object.keys(AE_REGIONS) as RegionCode[]).map((code) => [new RegExp(`\\b${regionName(code).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), code]);

export function guessPlace(text: string): { city: string; region: string; country: Country | null; remote: boolean } {
  const remote = /\bremote\b/i.test(text);
  for (const m of text.matchAll(/\b([A-Z][A-Za-z.'’-]+(?: [A-Z][A-Za-z.'’-]+){0,3}),\s*([A-Z]{2})\b/g)) {
    const code = m[2]!;
    if (isRegion(code)) return { city: m[1]!, region: code, country: countryOf(code), remote };
  }
  for (const [re, code] of AE_NAMES) if (re.test(text)) return { city: regionName(code), region: code, country: "AE", remote };
  for (const code of Object.keys(CA_REGIONS) as RegionCode[]) {
    if (new RegExp(`\\b${regionName(code)}\\b`).test(text)) return { city: "", region: code, country: "CA", remote };
  }
  if (/\b(UAE|United Arab Emirates)\b/.test(text)) return { city: "", region: "", country: "AE", remote };
  if (/\bCanada\b/.test(text)) return { city: "", region: "", country: "CA", remote };
  if (/\b(USA|United States|U\.S\.)\b/.test(text)) return { city: "", region: "", country: "US", remote };
  return { city: "", region: "", country: null, remote };
}

/** The sentence that gave the type away, or the opening, kept short for the record. */
export function pickQuote(text: string, type: SignalType): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const re = TYPE_RULES.find(([t]) => t === type)?.[1];
  const sentences = flat.split(/(?<=[.!?])\s+/);
  const hit = re ? sentences.find((s) => re.test(s)) : undefined;
  const q = (hit ?? flat).trim();
  return q.length > 280 ? q.slice(0, 277).replace(/\s+\S*$/, "") + "…" : q;
}

export function parseSignal(text: string, url: string, today: string): ParsedSignal {
  const ls = lines(text);
  const type = guessType(text, url);
  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text)?.[0]?.toLowerCase() ?? "";
  const links = [...text.matchAll(/https?:\/\/[^\s<>()"']+/g)].map((m) => m[0]);
  const place = guessPlace(text);
  return {
    company: guessCompany(text),
    headline: (ls[0] ?? "").slice(0, 160),
    type,
    signalDate: guessDate(text, today),
    ...place,
    companyDomain: companyDomain(url, ...links, email),
    email,
    source: sourceOf(url) || (links[0] ? sourceOf(links[0]) : ""),
    quote: text.trim() ? pickQuote(text, type) : "",
  };
}

// Duplicate keys for IT prospects: the company's domain, its email, phone digits, Maps place, and name + city.
// Two prospects never share a key (the it_keys table). Helpers here are pure so the forms and the CSV import can use them too.
import { normText, phoneDigits } from "@/lib/store/dupes";
import { placeKey } from "@/lib/scrape/placeKey";

/** Mailbox providers: an address there says nothing about the company's domain. */
export const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "aol.com", "icloud.com", "me.com",
  "mac.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "zoho.com", "yandex.com", "hotmail.co.uk", "yahoo.co.uk", "yahoo.ca", "rocketmail.com",
]);

/** Job boards, social sites and portals: a link there is the signal's source, never the company's own site. */
export const NOT_COMPANY_HOSTS = [
  "linkedin.com", "indeed.com", "glassdoor.com", "wellfound.com", "angel.co", "upwork.com", "fiverr.com", "freelancer.com", "clutch.co", "reddit.com",
  "sam.gov", "canadabuys.canada.ca", "buyandsell.gc.ca", "google.com", "goo.gl", "facebook.com", "instagram.com", "x.com", "twitter.com", "youtube.com",
  "ycombinator.com", "remoteok.com", "weworkremotely.com", "greenhouse.io", "lever.co", "workable.com", "bamboohr.com", "ziprecruiter.com", "monster.com",
  "dice.com", "builtin.com", "simplyhired.com", "contra.com", "toptal.com", "bing.com", "esupply.dubai.gov.ae", "adgpg.gov.ae", "wa.me", "whatsapp.com",
];

const onHost = (host: string, list: readonly string[]) => list.some((h) => host === h || host.endsWith("." + h));

/**
 * The bare domain of a URL, email or typed domain: "https://www.Acme.io/jobs" → "acme.io", "jo@acme.io" → "acme.io".
 * Returns "" for anything that isn't a plausible domain.
 */
export function domainOf(v: string): string {
  let s = v.trim().toLowerCase();
  if (!s) return "";
  if (s.includes("@") && !s.includes("/")) s = s.slice(s.lastIndexOf("@") + 1);
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^www\d?\./, "");
  s = s.split(/[/?#:\s]/)[0] ?? "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) && !s.split(".").some((p) => !p || p.startsWith("-") || p.endsWith("-")) ? s : "";
}

/** The company's own domain from its website or email, skipping free mailboxes and job boards. */
export function companyDomain(...candidates: string[]): string {
  for (const c of candidates) {
    const d = domainOf(c);
    if (d && !FREE_MAIL.has(d) && !onHost(d, NOT_COMPANY_HOSTS)) return d;
  }
  return "";
}

export const isBoardHost = (url: string): boolean => {
  const d = domainOf(url);
  return !!d && onHost(d, NOT_COMPANY_HOSTS);
};

export interface KeySource { companyDomain: string; email: string; phone: string; mapsUrl: string; company: string; city: string }

export const IT_KEY_LABEL = { d: "website domain", e: "email", p: "phone number", m: "Google Maps place", n: "name and city" } as const;
export type ItKeyKind = keyof typeof IT_KEY_LABEL;

/** Every key a prospect answers to, most specific first. */
export function prospectKeys(p: KeySource): string[] {
  const keys: string[] = [];
  const d = domainOf(p.companyDomain);
  if (d) keys.push("d:" + d);
  const e = p.email.trim().toLowerCase();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) keys.push("e:" + e);
  const ph = phoneDigits(p.phone);
  if (ph) keys.push("p:" + ph);
  const m = p.mapsUrl ? placeKey(p.mapsUrl) : null;
  if (m) keys.push("m:" + m);
  const name = normText(p.company), city = normText(p.city);
  if (name && city) keys.push(`n:${name}|${city}`);
  return [...new Set(keys)];
}

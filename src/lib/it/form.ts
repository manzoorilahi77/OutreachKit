// Reading and checking the IT Prospects forms. Pure: the server actions and the CSV import share these checks.
import { COUNTRIES, countryOf, isCountry, isRegion, type Country } from "@/lib/market/regions";
import { companyDomain, domainOf } from "./keys";
import { isSegment, isSignalType, isTeamSize, type ItProspectInput, type ItSignalInput } from "./model";

type Get = (name: string) => string;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

export const MAX = {
  company: 255, companyDomain: 255, websiteUrl: 1000, linkedinUrl: 1000, contactName: 200, contactTitle: 200, email: 255, phone: 100, whatsapp: 300,
  city: 200, notes: 5000, url: 1000, quote: 2000, source: 40,
} as const;

const tooLong = (label: string, v: string, max: number) => (v.length > max ? `${label} is too long (${max} characters at most).` : null);

/** An http(s) link, or "" — never a javascript: or data: link. */
export function cleanUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return "";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const validDay = (v: string): boolean => ISO_DAY.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));

export function parseProspect(get: Get): { ok: true; value: ItProspectInput } | { ok: false; error: string } {
  const t = (k: string) => get(k).trim().replace(/\s+/g, " ");
  const company = t("company");
  if (!company) return { ok: false, error: "Enter the company's name." };
  const segment = get("segment");
  if (!isSegment(segment)) return { ok: false, error: "Choose a segment." };
  const website = cleanUrl(get("websiteUrl"));
  if (website === null) return { ok: false, error: "The website must be an http or https link." };
  const linkedin = cleanUrl(get("linkedinUrl"));
  if (linkedin === null) return { ok: false, error: "The LinkedIn link must be an http or https link." };
  const email = t("email").toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "That email address doesn't look right." };
  const typedDomain = get("companyDomain").trim();
  const domain = typedDomain ? domainOf(typedDomain) : companyDomain(website, email);
  if (typedDomain && !domain) return { ok: false, error: "The company domain should look like example.com." };
  const region = get("region").trim().toUpperCase();
  if (region && !isRegion(region)) return { ok: false, error: "Choose a state, province or emirate from the list." };
  const countryRaw = get("country").trim().toUpperCase();
  const country: Country = region ? countryOf(region) : isCountry(countryRaw) ? countryRaw : "US";
  if (countryRaw && isCountry(countryRaw) && region && countryOf(region) !== countryRaw) {
    return { ok: false, error: `That ${COUNTRIES[countryRaw].region.toLowerCase()} isn't in ${COUNTRIES[countryRaw].name}.` };
  }
  const teamSize = get("teamSize").trim();
  if (!isTeamSize(teamSize)) return { ok: false, error: "Choose a team size from the list." };
  const value: ItProspectInput = {
    segment, company, companyDomain: domain, websiteUrl: website, linkedinUrl: linkedin, contactName: t("contactName"), contactTitle: t("contactTitle"),
    email, phone: t("phone"), whatsapp: t("whatsapp"), city: t("city"), region, country, teamSize, notes: get("notes").trim(),
  };
  for (const [k, max] of Object.entries(MAX)) {
    const v = (value as unknown as Record<string, unknown>)[k];
    if (typeof v === "string") {
      const e = tooLong(k.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase()), v, max);
      if (e) return { ok: false, error: e };
    }
  }
  if ([company, value.contactName, value.contactTitle, value.city, value.phone].some((v) => CTRL.test(v))) return { ok: false, error: "Remove the control characters from the form." };
  return { ok: true, value };
}

export function parseSignalInput(get: Get): { ok: true; value: ItSignalInput } | { ok: false; error: string } {
  const type = get("signalType");
  if (!isSignalType(type)) return { ok: false, error: "Choose the kind of signal." };
  const url = cleanUrl(get("signalUrl"));
  if (url === null) return { ok: false, error: "The signal link must be an http or https link." };
  const quote = get("signalQuote").trim();
  if (!url && !quote) return { ok: false, error: "Add the signal's link or a short quote from it." };
  const date = get("signalDate").trim();
  if (date && !validDay(date)) return { ok: false, error: "The signal date should be a date (YYYY-MM-DD)." };
  const source = get("signalSource").trim();
  for (const [label, v, max] of [["The link", url, MAX.url], ["The quote", quote, MAX.quote], ["The source", source, MAX.source]] as const) {
    const e = tooLong(label, v, max);
    if (e) return { ok: false, error: e };
  }
  return { ok: true, value: { type, url, quote, signalDate: date || null, source } };
}

/** FormData as a getter: missing fields read as "". */
export const fromFormData = (fd: FormData): Get => (k) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

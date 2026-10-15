// Whether a lead has a website, for the Leads page filter and the website icon.
export type WebsiteStatus = "with" | "without" | "unknown";
export interface SiteLead { website_found: boolean | null; website_url: string }
export interface WebsiteOption { v: WebsiteStatus; l: string; count: number }

const LABEL: Record<WebsiteStatus, string> = { with: "With website", without: "Without website", unknown: "Not checked yet" };
const ORDER: WebsiteStatus[] = ["with", "without", "unknown"];

export const isWebsiteFilter = (v: unknown): v is WebsiteStatus => v === "with" || v === "without" || v === "unknown";

/** "with" when a site was found or an address is held, "without" when one was looked for and none found, "unknown" when nobody has checked. */
export function websiteStatus(l: SiteLead): WebsiteStatus {
  if (l.website_found === true || l.website_url.trim()) return "with";
  return l.website_found === false ? "without" : "unknown";
}

/** The dropdown's choices with counts. "Not checked yet" appears only when some lead is in it, or it is the chosen value. */
export function websiteOptions(leads: SiteLead[], chosen: WebsiteStatus | undefined): WebsiteOption[] {
  const counts: Record<WebsiteStatus, number> = { with: 0, without: 0, unknown: 0 };
  for (const l of leads) counts[websiteStatus(l)]++;
  return ORDER.filter((v) => v !== "unknown" || counts.unknown > 0 || chosen === "unknown").map((v) => ({ v, l: LABEL[v], count: counts[v] }));
}

/** An address worth linking to. Typed by hand, so "www.x.com" gets https://, and anything with another scheme (javascript:, data:) is dropped. */
export function webHref(raw: string): string {
  const v = raw.trim();
  if (!v || /\s/.test(v)) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return "";
  return /^[^/.]+\.[^/]+/.test(v) ? `https://${v}` : "";
}

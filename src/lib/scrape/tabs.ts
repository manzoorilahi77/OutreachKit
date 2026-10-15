import type { BusinessRow } from "./types";

export type WebsiteTab = "without" | "with";

/** The finder's two tabs. A row with no `hasWebsite` (saved before the field existed) counts as having none. */
export function splitByWebsite(rows: BusinessRow[]): Record<WebsiteTab, BusinessRow[]> {
  const out: Record<WebsiteTab, BusinessRow[]> = { without: [], with: [] };
  for (const r of rows) out[r.hasWebsite ? "with" : "without"].push(r);
  return out;
}

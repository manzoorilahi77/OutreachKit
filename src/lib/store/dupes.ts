// The duplicate index. A business is "already someone's lead" when another lead shares its Maps place key,
// its phone digits, or its normalised name + city. Built from every folder on this laptop, so it is as fresh as the last sync.
import { placeKey } from "@/lib/scrape/placeKey";

const SUFFIX = /\b(llc|l l c|inc|incorporated|co|corp|corporation|ltd|limited|the)\b/g;

/** Lower-case letters and digits only, legal suffixes dropped: "Smith Roofing, LLC" and "smith roofing" are the same name. */
export const normText = (s: string): string => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(SUFFIX, " ").replace(/[^a-z0-9]+/g, "");

/**
 * Phone digits without the country code, so "+1 512…" and "512…" match, and "+971 4 123 4567" and "04 123 4567" match.
 * North America drops a leading 1 before ten digits; the UAE drops 971 (or 00971) before eight or nine digits, or the
 * trunk 0. A US number never starts with 0, and a ten-digit one that starts with 971 is left alone. Fewer than 7 digits is not a usable key.
 */
export function phoneDigits(phone: string): string | null {
  const d = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").replace(/^00971(?=\d{8,9}$)/, "").replace(/^971(?=\d{8,9}$)/, "").replace(/^0(?=\d{8,9}$)/, "");
  return d.length >= 7 ? d : null;
}

export interface DupCandidate { business_name: string; city: string; phone: string; google_maps_url: string }

export const KEY_LABEL = { m: "Google Maps place", p: "phone number", n: "name and city" } as const;
export type KeyKind = keyof typeof KEY_LABEL;

/** The keys a business answers to, most specific first. */
export function dupKeys(c: DupCandidate): string[] {
  const keys: string[] = [];
  const m = c.google_maps_url ? placeKey(c.google_maps_url) : null;
  if (m) keys.push("m:" + m);
  const p = phoneDigits(c.phone);
  if (p) keys.push("p:" + p);
  const name = normText(c.business_name);
  const city = normText(c.city);
  if (name && city) keys.push(`n:${name}|${city}`);
  return keys;
}

/** A finder result's keys. Its place key is stored already. */
export function finderKeys(b: { placeKey: string; phone: string; name: string; city: string }): string[] {
  const keys = ["m:" + b.placeKey];
  const p = phoneDigits(b.phone);
  if (p) keys.push("p:" + p);
  const name = normText(b.name);
  const city = normText(b.city);
  if (name && city) keys.push(`n:${name}|${city}`);
  return keys;
}

export interface DupHit { key: string; kind: KeyKind; holder: string; businessName: string; ref: string }

export class DupIndex {
  private map = new Map<string, DupHit[]>();

  add(keys: string[], holder: string, businessName: string, ref: string) {
    for (const key of keys) {
      const list = this.map.get(key) ?? [];
      list.push({ key, kind: key[0] as KeyKind, holder, businessName, ref });
      this.map.set(key, list);
    }
  }

  /** The first hit for any of the keys, skipping entries whose ref is in `ignoreRefs` (the business itself, or a copy of it). */
  find(keys: string[], ignoreRefs: ReadonlySet<string> = new Set()): DupHit | null {
    for (const k of keys) {
      const hit = this.map.get(k)?.find((h) => !ignoreRefs.has(h.ref));
      if (hit) return hit;
    }
    return null;
  }

  get size() { return this.map.size; }
}

import { isRegion, regionName } from "@/lib/market/regions";

export interface PlaceLead { state: string; city: string; category: string | null }
export interface PlaceOption { v: string; l: string; count: number }
export interface PlaceSelection { state?: string; city?: string; category?: string }

const upper = (s: string) => s.trim().toUpperCase();
const lower = (s: string) => s.trim().toLowerCase();
const byLabel = (a: PlaceOption, b: PlaceOption) => a.l.localeCompare(b.l);

/**
 * The state, city and category filters of the leads list. `base` is whatever else already narrows the list (country, size), so
 * every count agrees with it. Each dropdown is counted against the other two, never against itself, so its options show what
 * choosing them would leave. A selection that matches no lead is dropped, like the page does for an unknown "Held by".
 * Cities only make sense inside a state (two states can share a city name), so they follow the chosen state, or the only state there is.
 */
export function placeFacets<L extends PlaceLead>(all: L[], sel: PlaceSelection, base: (l: L) => boolean) {
  const pool = all.filter(base);
  const stateOf = (l: L) => upper(l.state);

  const states = new Set(pool.map(stateOf).filter(Boolean));
  const state = sel.state && states.has(upper(sel.state)) ? upper(sel.state) : undefined;
  const cityState = state ?? (states.size === 1 ? [...states][0] : undefined);

  const cityLead = (l: L) => !!l.city.trim() && (!cityState || stateOf(l) === cityState);
  const canonicalCity = new Map<string, string>();
  for (const l of pool) if (cityLead(l) && !canonicalCity.has(lower(l.city))) canonicalCity.set(lower(l.city), l.city.trim());
  const city = cityState && sel.city ? canonicalCity.get(lower(sel.city)) : undefined;
  const category = sel.category && pool.some((l) => l.category === sel.category) ? sel.category : undefined;

  const inState = (l: L) => !state || stateOf(l) === state;
  const inCity = (l: L) => !city || lower(l.city) === lower(city);
  const inCategory = (l: L) => !category || l.category === category;

  function tally(rows: L[], key: (l: L) => string, label: (k: string) => string, keep?: string): PlaceOption[] {
    const counts = new Map<string, number>();
    for (const l of rows) { const k = key(l); if (k) counts.set(k, (counts.get(k) ?? 0) + 1); }
    if (keep && !counts.has(keep)) counts.set(keep, 0);
    return [...counts].map(([v, count]) => ({ v, l: label(v), count })).sort(byLabel);
  }

  return {
    state, city, category, cityState,
    states: tally(pool.filter(inCategory), stateOf, (c) => (isRegion(c) ? `${regionName(c)} (${c})` : c), state),
    cities: cityState ? tally(pool.filter((l) => cityLead(l) && inCategory(l)), (l) => canonicalCity.get(lower(l.city)) ?? "", (c) => c, city) : [],
    categories: tally(pool.filter((l) => inState(l) && inCity(l)), (l) => l.category ?? "", (c) => c, category),
    /** The place part of the filter. Country and size are applied by the caller. */
    matches: (l: L) => inState(l) && inCity(l) && inCategory(l),
  };
}

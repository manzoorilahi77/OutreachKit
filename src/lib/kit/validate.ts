import { countryOf, isRegion, regionCities, type RegionCode } from "@/lib/market/regions";
import { isSiteLang, type SiteLang } from "@/lib/market/notes";
import { findCategory } from "./categories";
import type { Device } from "./types";

export interface SavedKitInput { category: string; device: Device; state: RegionCode; city: string; cityIsFree: boolean; siteLang?: SiteLang }

/** Checks console choices before they are saved. Returns the cleaned input or an error message. */
export function validateKit(raw: { category?: unknown; device?: unknown; state?: unknown; city?: unknown; siteLang?: unknown }): { ok: true; value: SavedKitInput } | { ok: false; error: string } {
  const category = typeof raw.category === "string" ? raw.category : "";
  const state = typeof raw.state === "string" ? raw.state : "";
  const city = typeof raw.city === "string" ? raw.city.trim() : "";
  if (!findCategory(category)) return { ok: false, error: "Pick a category from the board." };
  if (raw.device !== "desktop" && raw.device !== "mobile") return { ok: false, error: "Pick desktop or phone." };
  if (!isRegion(state)) return { ok: false, error: "Pick a state, province or emirate." };
  if (!city || city.length > 120) return { ok: false, error: "Add a city." };
  const listed = regionCities(state).includes(city);
  const siteLang = countryOf(state) === "AE" ? (isSiteLang(raw.siteLang) ? raw.siteLang : "en") : undefined;
  return { ok: true, value: { category, device: raw.device, state, city, cityIsFree: !listed, ...(siteLang ? { siteLang } : {}) } };
}

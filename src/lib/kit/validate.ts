import { STATES } from "@/data";
import type { StateCode } from "@/data";
import { findCategory } from "./categories";
import type { Device } from "./types";

export interface SavedKitInput { category: string; device: Device; state: StateCode; city: string; cityIsFree: boolean }

/** Checks console choices before they are saved. Returns the cleaned input or an error message. */
export function validateKit(raw: { category?: unknown; device?: unknown; state?: unknown; city?: unknown }): { ok: true; value: SavedKitInput } | { ok: false; error: string } {
  const category = typeof raw.category === "string" ? raw.category : "";
  const state = typeof raw.state === "string" ? raw.state : "";
  const city = typeof raw.city === "string" ? raw.city.trim() : "";
  if (!findCategory(category)) return { ok: false, error: "Pick a category from the board." };
  if (raw.device !== "desktop" && raw.device !== "mobile") return { ok: false, error: "Pick desktop or phone." };
  if (!(state in STATES)) return { ok: false, error: "Pick a state." };
  if (!city || city.length > 120) return { ok: false, error: "Add a city." };
  const listed = STATES[state as StateCode][1].split("|").includes(city);
  return { ok: true, value: { category, device: raw.device, state: state as StateCode, city, cityIsFree: !listed } };
}

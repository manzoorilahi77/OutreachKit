// The IT finder's run request: one of the IT categories, a real region, a city and one of the lead finder's limits.
import { isRegion } from "@/lib/market/regions";
import { isLimitOption } from "@/lib/scrape/limits";
import type { RunRequest } from "@/lib/scrape/http";
import { findItCategory } from "./categories";

export function parseItRunRequest(body: unknown): { ok: true; value: RunRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const category = typeof b.category === "string" ? b.category : "";
  const state = typeof b.state === "string" ? b.state.toUpperCase() : "";
  const city = typeof b.city === "string" ? b.city.trim().replace(/\s+/g, " ") : "";
  if (!findItCategory(category)) return { ok: false, error: "Pick a category first." };
  if (!isRegion(state)) return { ok: false, error: "Pick a state, province or emirate first." };
  if (!city || city.length > 120 || /[\u0000-\u001f<>]/.test(city)) return { ok: false, error: "Pick or type a city first." };
  if (!isLimitOption(b.limit)) return { ok: false, error: "Choose a limit of 20, 50, 70 or 100." };
  return { ok: true, value: { category, state, city, limit: b.limit } };
}

/** One browser at a time on this server, shared with the lead finder: both drive the same Google Maps. */
export const finderLock = globalThis as { __leadfinderRunning?: boolean };

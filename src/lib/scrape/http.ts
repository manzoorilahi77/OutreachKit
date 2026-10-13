// The wire format between the browser and the run route: a Server-Sent-Events body, read from a fetch() response.
import { isRegion } from "../market/regions";
import { findCategory } from "../kit/categories";
import { isLimitOption } from "./limits";
import type { RunEvent } from "./types";

export interface RunRequest { category: string; state: string; city: string; limit: number }

/** Checks the body of POST /api/leadfinder/run. The category must be one of the console's, the state a real code. */
export function parseRunRequest(body: unknown): { ok: true; value: RunRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const category = typeof b.category === "string" ? b.category : "";
  const state = typeof b.state === "string" ? b.state.toUpperCase() : "";
  const city = typeof b.city === "string" ? b.city.trim().replace(/\s+/g, " ") : "";
  if (!findCategory(category)) return { ok: false, error: "Pick a category first." };
  if (!isRegion(state)) return { ok: false, error: "Pick a state, province or emirate first." };
  if (!city || city.length > 120 || /[\u0000-\u001f<>]/.test(city)) return { ok: false, error: "Pick or type a city first." };
  if (!isLimitOption(b.limit)) return { ok: false, error: "Choose a limit of 20, 50, 70 or 100." };
  return { ok: true, value: { category, state, city, limit: b.limit } };
}

/** The route changes data and starts a browser, so only this site's own pages may call it. */
export function sameOrigin(headers: { get(name: string): string | null }): boolean {
  const origin = headers.get("origin");
  if (!origin) return true; // same-origin GETs and non-browser callers send none
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

export const sseFrame = (e: RunEvent) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;

/** Feed it chunks of the response; it returns the events completed so far and keeps the remainder. */
export function createSseParser() {
  let buf = "";
  return (chunk: string): RunEvent[] => {
    buf += chunk;
    const out: RunEvent[] = [];
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!data) continue;
      try { out.push(JSON.parse(data) as RunEvent); } catch { /* a malformed frame is skipped */ }
    }
    return out;
  };
}

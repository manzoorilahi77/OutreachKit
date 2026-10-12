// The one place the app asks for the time. Sessions, suspensions and sync stamps all use it, so tests and the two-laptop e2e
// can move the clock. The override is read from .local/clock.json and works only when OKIT_ALLOW_CLOCK_OVERRIDE=1.
import { readFileSync } from "node:fs";
import path from "node:path";
import { rootDir } from "./store/paths";

export function now(): Date {
  if (process.env.OKIT_ALLOW_CLOCK_OVERRIDE === "1") {
    try {
      const j = JSON.parse(readFileSync(path.join(rootDir(), ".local", "clock.json"), "utf8")) as { offsetMs?: number };
      if (typeof j.offsetMs === "number") return new Date(Date.now() + j.offsetMs);
    } catch { /* no override */ }
  }
  return new Date();
}

export const nowIso = () => now().toISOString();
/** YYYY-MM-DD in UTC, for stamps and suspension end dates. The rep's own calendar day for lead dates comes from their browser. */
export const todayIso = () => nowIso().slice(0, 10);

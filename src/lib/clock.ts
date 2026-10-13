// The one place the app asks for the time. Sessions, suspensions and stamps all use it, so the end-to-end test can move the clock.
// OKIT_CLOCK_OFFSET_MS shifts it, and only when OKIT_ALLOW_CLOCK_OVERRIDE=1, which only that test sets.
export function now(): Date {
  if (process.env.OKIT_ALLOW_CLOCK_OVERRIDE === "1") {
    const offset = Number(process.env.OKIT_CLOCK_OFFSET_MS ?? 0);
    if (Number.isFinite(offset) && offset !== 0) return new Date(Date.now() + offset);
  }
  return new Date();
}

export const nowIso = () => now().toISOString();
/** YYYY-MM-DD in UTC, for stamps and suspension end dates. The rep's own calendar day for lead dates comes from their browser. */
export const todayIso = () => nowIso().slice(0, 10);

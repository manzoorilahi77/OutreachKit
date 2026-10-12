// "Today's limit": a ceiling on NEW no-website businesses saved per calendar day (local time), counted from MySQL.

export const LIMIT_OPTIONS = [20, 50, 70, 100] as const;
export const DEFAULT_LIMIT = 50;

export const isLimitOption = (n: unknown): n is (typeof LIMIT_OPTIONS)[number] => LIMIT_OPTIONS.some((o) => o === n);

/** The calendar day in local time, as YYYY-MM-DD. The database never decides the day; its time zone may differ. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const savedTodayLabel = (saved: number, limit: number) => `Saved today: ${saved} of ${limit}`;

/** Counts saves against the day's ceiling. `saved` starts at what MySQL already holds for the day. */
export class DailyBudget {
  saved: number;
  constructor(saved: number, readonly limit: number, readonly day: string = localDay()) {
    this.saved = Math.max(0, Math.floor(saved));
  }
  get remaining() { return Math.max(0, this.limit - this.saved); }
  get reached() { return this.saved >= this.limit; }
  /** Count one saved business. Returns false (and counts nothing) when the ceiling is already reached. */
  record(): boolean {
    if (this.reached) return false;
    this.saved++;
    return true;
  }
  /** True once the calendar day has moved on since the run started: the count would no longer be today's. */
  rolledOver(now: Date = new Date()) { return localDay(now) !== this.day; }
}

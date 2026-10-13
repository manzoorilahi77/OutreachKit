// Five failed sign-ins in 15 minutes for a username lock that username for 15 minutes.
// Failures are counted by the name typed, whether or not the account exists, so the lock reveals nothing.
// The failures live in the database, so the lock holds across restarts and for every browser.
import type { Pool, RowDataPacket } from "mysql2/promise";
import { fromDbTime, toDbTime } from "@/lib/db/time";

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

/** Where failed attempts are kept: the database in the app, memory in tests. */
export interface FailureLog {
  /** Failure times (ms) for this key since `sinceMs`, oldest first. */
  recent(key: string, sinceMs: number): Promise<number[]>;
  add(key: string, atMs: number): Promise<void>;
  clear(key: string): Promise<void>;
  /** Forget everything older than `beforeMs`, for every key. */
  prune(beforeMs: number): Promise<void>;
}

export function memoryFailureLog(): FailureLog {
  const book = new Map<string, number[]>();
  return {
    async recent(key, since) { return (book.get(key) ?? []).filter((t) => t >= since).sort((a, b) => a - b); },
    async add(key, at) { book.set(key, [...(book.get(key) ?? []), at]); },
    async clear(key) { book.delete(key); },
    async prune(before) { for (const [k, v] of book) { const keep = v.filter((t) => t >= before); if (keep.length) book.set(k, keep); else book.delete(k); } },
  };
}

export function dbFailureLog(pool: Pool): FailureLog {
  return {
    async recent(key, since) {
      const [r] = await pool.query<RowDataPacket[]>("SELECT failed_at FROM signin_failures WHERE username_key = ? AND failed_at >= ? ORDER BY failed_at", [key, toDbTime(new Date(since).toISOString())]);
      return r.map((x) => Date.parse(fromDbTime(x.failed_at)));
    },
    async add(key, at) { await pool.query("INSERT INTO signin_failures (username_key, failed_at) VALUES (?, ?)", [key, toDbTime(new Date(at).toISOString())]); },
    async clear(key) { await pool.query("DELETE FROM signin_failures WHERE username_key = ?", [key]); },
    async prune(before) { await pool.query("DELETE FROM signin_failures WHERE failed_at < ?", [toDbTime(new Date(before).toISOString())]); },
  };
}

const keyOf = (username: string) => username.trim().toLowerCase().slice(0, 64);

export class SignInLimiter {
  constructor(private log: FailureLog) {}

  private recent(username: string, nowMs: number): Promise<number[]> {
    return this.log.recent(keyOf(username), nowMs - WINDOW_MS + 1);
  }

  /** When locked, the time (ms) the lock ends. */
  async lockedUntil(username: string, nowMs: number): Promise<number | null> {
    const r = await this.recent(username, nowMs);
    return r.length >= MAX_FAILURES ? r[r.length - 1]! + WINDOW_MS : null;
  }

  async fail(username: string, nowMs: number): Promise<void> {
    const r = await this.recent(username, nowMs);
    if (r.length < MAX_FAILURES) await this.log.add(keyOf(username), nowMs); // attempts during a lock don't extend it
    await this.log.prune(nowMs - WINDOW_MS);
  }

  async clear(username: string): Promise<void> {
    await this.log.clear(keyOf(username));
  }
}

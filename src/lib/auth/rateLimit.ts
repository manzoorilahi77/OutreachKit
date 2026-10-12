// Five failed sign-ins in 15 minutes for a username on this laptop lock that username for 15 minutes.
// Failures are counted by the name typed, whether or not the account exists, so the lock reveals nothing.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;

type Book = Record<string, number[]>;

export interface Storage { read(): Promise<Book>; write(b: Book): Promise<void> }

export function fileStorage(root: string): Storage {
  const file = path.join(root, ".local", "signin-failures.json");
  return {
    async read() {
      try { return JSON.parse(await readFile(file, "utf8")) as Book; } catch { return {}; }
    },
    async write(b) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(b) + "\n", "utf8");
    },
  };
}

const keyOf = (username: string) => username.trim().toLowerCase().slice(0, 64);

export class SignInLimiter {
  constructor(private storage: Storage) {}

  private async recent(username: string, nowMs: number): Promise<number[]> {
    const book = await this.storage.read();
    return (book[keyOf(username)] ?? []).filter((t) => nowMs - t < WINDOW_MS);
  }

  /** When locked, the time (ms) the lock ends. */
  async lockedUntil(username: string, nowMs: number): Promise<number | null> {
    const r = await this.recent(username, nowMs);
    return r.length >= MAX_FAILURES ? r[r.length - 1]! + WINDOW_MS : null;
  }

  async fail(username: string, nowMs: number): Promise<void> {
    const book = await this.storage.read();
    const k = keyOf(username);
    const r = (book[k] ?? []).filter((t) => nowMs - t < WINDOW_MS);
    if (r.length < MAX_FAILURES) r.push(nowMs); // attempts during a lock don't extend it
    book[k] = r;
    for (const other of Object.keys(book)) if (other !== k) { book[other] = book[other]!.filter((t) => nowMs - t < WINDOW_MS); if (!book[other]!.length) delete book[other]; }
    await this.storage.write(book);
  }

  async clear(username: string): Promise<void> {
    const book = await this.storage.read();
    delete book[keyOf(username)];
    await this.storage.write(book);
  }
}

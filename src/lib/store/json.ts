// File I/O for team/. JSON is written with sorted keys, two-space indent, LF and a trailing newline so git diffs stay small.
// Writes go to a temp file in the same folder, then rename; the rename is retried on Windows' EPERM/EBUSY.
import { randomBytes } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, sortKeys(o[k])]));
  }
  return v;
}

/** `indent: 0` gives one compact line (for .jsonl). */
export const stableStringify = (v: unknown, indent = 2): string => JSON.stringify(sortKeys(v), null, indent || undefined);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function renameWithRetry(from: string, to: string, attempts = 5, rn: typeof rename = rename): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      await rn(from, to);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if ((code !== "EPERM" && code !== "EBUSY") || i >= attempts) throw e;
      await sleep(20 * i);
    }
  }
}

export async function writeFileAtomic(file: string, text: string, rn: typeof rename = rename): Promise<void> {
  const dir = path.dirname(file);
  await mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    await writeFile(tmp, text, "utf8");
    await renameWithRetry(tmp, file, 5, rn);
  } catch (e) {
    await rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}

export const writeJson = (file: string, data: unknown) => writeFileAtomic(file, stableStringify(data) + "\n");

export async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Parsed JSON, or null when the file is missing or isn't valid JSON (a half-pulled or hand-edited file must not crash the app). */
export async function readJson<T = unknown>(file: string): Promise<T | null> {
  const t = await readText(file);
  if (t === null) return null;
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
}

/** Appends one compact line. Append-only files never lose earlier lines. */
export async function appendLine(file: string, obj: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, stableStringify(obj, 0) + "\n", "utf8");
}

export async function readLines<T = unknown>(file: string): Promise<T[]> {
  const t = await readText(file);
  if (!t) return [];
  const out: T[] = [];
  for (const line of t.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as T); } catch { /* a torn or merged line is skipped */ }
  }
  return out;
}

export async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

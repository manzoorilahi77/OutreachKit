// When each person last signed in on THIS laptop (shown on the Users page). Local only: .local/ is never pushed.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const file = (root: string) => path.join(root, ".local", "signins.json");

export async function readSignIns(root: string): Promise<Record<string, string>> {
  try { return JSON.parse(await readFile(file(root), "utf8")) as Record<string, string>; } catch { return {}; }
}

export async function recordSignIn(root: string, username: string, iso: string): Promise<void> {
  const all = await readSignIns(root);
  all[username] = iso;
  await mkdir(path.dirname(file(root)), { recursive: true });
  await writeFile(file(root), JSON.stringify(all, null, 2) + "\n", "utf8");
}

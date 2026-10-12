// The session secret lives in .local/session-secret, generated on first run and never committed.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { rootDir } from "@/lib/store/paths";

const cache = new Map<string, string>();

export function sessionSecret(root: string = rootDir()): string {
  const hit = cache.get(root);
  if (hit) return hit;
  const file = path.join(root, ".local", "session-secret");
  let secret = "";
  try {
    secret = readFileSync(file, "utf8").trim();
  } catch { /* first run */ }
  if (secret.length < 32) {
    mkdirSync(path.dirname(file), { recursive: true });
    secret = randomBytes(32).toString("hex");
    // wx: never overwrite a secret another process wrote a moment ago.
    try {
      writeFileSync(file, secret + "\n", { flag: "wx", mode: 0o600 });
    } catch {
      secret = readFileSync(file, "utf8").trim();
    }
    if (existsSync(file)) { try { chmodSync(file, 0o600); } catch { /* Windows */ } }
  }
  cache.set(root, secret);
  return secret;
}

// The key that signs session cookies. In production it is the SESSION_SECRET environment variable (32 or more characters),
// and the app refuses to run without it. In development a random one is made once and kept in .local/session-secret
// (never committed), so a restart doesn't sign everyone out.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const MIN_SECRET_LENGTH = 32;
const g = globalThis as { __okitSecret?: string };

export function sessionSecret(): string {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    if (fromEnv.length < MIN_SECRET_LENGTH) throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters. Make one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
    return fromEnv;
  }
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set. The app can't sign anyone in without it. See .env.example.");
  if (g.__okitSecret) return g.__okitSecret;
  const file = path.join(process.cwd(), ".local", "session-secret");
  let secret = "";
  try { secret = readFileSync(file, "utf8").trim(); } catch { /* first run */ }
  if (secret.length < MIN_SECRET_LENGTH) {
    mkdirSync(path.dirname(file), { recursive: true });
    secret = randomBytes(32).toString("hex");
    try {
      writeFileSync(file, secret + "\n", { flag: "wx", mode: 0o600 }); // wx: never overwrite a secret another process wrote a moment ago
    } catch {
      secret = readFileSync(file, "utf8").trim();
    }
    if (existsSync(file)) { try { chmodSync(file, 0o600); } catch { /* Windows */ } }
  }
  g.__okitSecret = secret;
  return secret;
}

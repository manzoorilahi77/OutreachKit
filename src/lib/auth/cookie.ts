// The session cookie: { username, issuedAt, rev } signed with HMAC-SHA256. Fixed 14 days from sign-in.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "okit_session";
export const SESSION_DAYS = 14;
export const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export interface SessionPayload { username: string; issuedAt: number; rev: number }

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const mac = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest();

export function signSession(p: SessionPayload, secret: string): string {
  const body = b64(JSON.stringify({ u: p.username, t: p.issuedAt, r: p.rev }));
  return `${body}.${b64(mac(body, secret))}`;
}

export function verifySession(token: string | undefined | null, secret: string): SessionPayload | null {
  if (!token) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const want = mac(body, secret);
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const j = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: unknown; t?: unknown; r?: unknown };
    if (typeof j.u !== "string" || typeof j.t !== "number" || typeof j.r !== "number") return null;
    return { username: j.u, issuedAt: j.t, rev: j.r };
  } catch {
    return null;
  }
}

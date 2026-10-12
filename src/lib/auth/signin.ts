import { hashPassword, verifyPassword } from "./password";
import type { SignInLimiter } from "./rateLimit";
import { effectiveStatus } from "./status";
import type { Store } from "@/lib/store/store";
import type { UserFile } from "@/lib/store/types";

/** One message for every failed sign-in, so it never says which part was wrong. */
export const SIGNIN_ERROR = "That username and password don't match, or the account is not active.";
export const LOCKED_ERROR = "Too many tries. Wait 15 minutes, then try again.";

export type SignInResult = { ok: true; user: UserFile; mustChangePassword: boolean } | { ok: false; message: string };

let dummy: Promise<string> | null = null;
/** Compared when the username doesn't exist, so a missing account takes as long as a wrong password. */
const dummyHash = () => (dummy ??= hashPassword("not-a-real-password"));

/**
 * The password that works is the person's own while profile.basedOnRev equals the user file's pwRev;
 * otherwise (new account, or an admin reset) the temporary one.
 */
export async function authenticate(o: { store: Store; limiter: SignInLimiter; username: string; password: string; now: Date }): Promise<SignInResult> {
  const username = o.username.trim().toLowerCase();
  const nowMs = o.now.getTime();
  if (await o.limiter.lockedUntil(username, nowMs)) return { ok: false, message: LOCKED_ERROR };

  const user = username ? await o.store.getUser(username) : null;
  const profile = user ? await o.store.getProfile(user.username) : null;
  const useOwn = !!(user && profile?.passwordHash && profile.basedOnRev === user.pwRev);
  const hash = user ? (useOwn ? profile!.passwordHash : user.tempPasswordHash) : await dummyHash();
  const match = await verifyPassword(o.password, hash);
  const active = !!user && effectiveStatus(user, o.now.toISOString().slice(0, 10)) === "active";

  if (!user || !match || !active) {
    await o.limiter.fail(username, nowMs);
    return { ok: false, message: SIGNIN_ERROR };
  }
  await o.limiter.clear(username);
  return { ok: true, user, mustChangePassword: !useOwn };
}

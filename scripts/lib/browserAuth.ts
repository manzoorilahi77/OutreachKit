// Signing in for the browser scripts: a session cookie signed with the app's own secret, so a script can open a screen as any role
// without typing a password 40 times. (The sign-in form itself is exercised in e2e.)
import type { BrowserContext } from "@playwright/test";
import { COOKIE_NAME, signSession } from "../../src/lib/auth/cookie";
import { sessionSecret } from "../../src/lib/auth/secret";
import { createStore } from "../../src/lib/store/fileStore";

export async function signInCookie(ctx: BrowserContext, root: string, url: string, username: string, issuedAt = Date.now()) {
  const user = await createStore(null, root).getUser(username);
  if (!user) throw new Error(`No account ${username} in ${root}`);
  const value = signSession({ username, issuedAt, rev: user.rev }, sessionSecret(root));
  await ctx.addCookies([{ name: COOKIE_NAME, value, url, httpOnly: true, sameSite: "Lax" }]);
}

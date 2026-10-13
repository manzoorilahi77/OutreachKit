// Signing in for the browser scripts: a session cookie signed with the running app's own secret, so a script can open a screen as any role
// without typing a password 40 times. (The sign-in form itself is exercised in e2e.)
import type { BrowserContext } from "@playwright/test";
import type { Pool } from "mysql2/promise";
import { COOKIE_NAME, signSession } from "../../src/lib/auth/cookie";
import { createMySqlStore } from "../../src/lib/store/mysqlStore";

export async function signInCookie(ctx: BrowserContext, pool: Pool, app: { url: string; secret: string }, username: string, issuedAt = Date.now()) {
  const user = await createMySqlStore(null, pool).getUser(username);
  if (!user) throw new Error(`No account ${username} in the demo database`);
  const value = signSession({ username, issuedAt, rev: user.rev }, app.secret);
  await ctx.addCookies([{ name: COOKIE_NAME, value, url: app.url, httpOnly: true, sameSite: "Lax" }]);
}

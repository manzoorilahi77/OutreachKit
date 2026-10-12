// Server-side entry points: getSession(), requirePerm() for pages, checkPerm() for actions, and the per-request Store.
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { now } from "@/lib/clock";
import { createStore } from "@/lib/store/fileStore";
import { rootDir } from "@/lib/store/paths";
import type { Store } from "@/lib/store/store";
import { COOKIE_NAME } from "./cookie";
import { can, type PermissionKey } from "./permissions";
import { sessionSecret } from "./secret";
import { actorOf, resolveSession, type Resolved, type Session } from "./session";

export const authStore = (): Store => createStore(null, rootDir());

/** The Store for the signed-in person: every read is scoped and every write guarded as them. */
export const storeFor = (s: Session): Store => createStore(actorOf(s), rootDir());

export const getResolved = cache(async (): Promise<Resolved> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return resolveSession(token, { store: authStore(), forActor: (a) => createStore(a, rootDir()), secret: sessionSecret(), now: now() });
});

export async function getSession(): Promise<Session | null> {
  const r = await getResolved();
  return r.kind === "ok" ? r.session : null;
}

/** For pages: sends the visitor where they belong, or returns the session. */
export async function requirePerm(key: PermissionKey | "session", opts: { allowMustChange?: boolean } = {}): Promise<Session> {
  const r = await getResolved();
  if (r.kind === "none") redirect("/login");
  if (r.kind === "no_access") redirect("/no-access");
  const s = r.session;
  if (s.mustChangePassword && !opts.allowMustChange) redirect("/account/password");
  if (key !== "session" && !can(s, key)) redirect(s.home);
  return s;
}

export type Checked = { ok: true; session: Session; store: Store } | { ok: false; message: string };

/** For server actions: never redirects, so a form can show the refusal in words. */
export async function checkPerm(key: PermissionKey | "session", opts: { allowMustChange?: boolean } = {}): Promise<Checked> {
  const r = await getResolved();
  if (r.kind !== "ok") return { ok: false, message: "Your sign-in has ended. Sign in again." };
  if (r.session.mustChangePassword && !opts.allowMustChange) return { ok: false, message: "Set your own password first." };
  if (key !== "session" && !can(r.session, key)) return { ok: false, message: "Your role can't do that." };
  return { ok: true, session: r.session, store: storeFor(r.session) };
}

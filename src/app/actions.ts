"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME, SESSION_MS, signSession } from "@/lib/auth/cookie";
import { recordSignIn } from "@/lib/auth/lastSignIn";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { dbFailureLog, SignInLimiter } from "@/lib/auth/rateLimit";
import { ROLE_HOMES } from "@/lib/auth/roles";
import { sessionSecret } from "@/lib/auth/secret";
import { authStore, checkPerm, getSession } from "@/lib/auth/server";
import { authenticate } from "@/lib/auth/signin";
import { now } from "@/lib/clock";
import { validateKit } from "@/lib/kit/validate";
import { isDirectionId } from "@/lib/kit-v2/themes";
import { safeNext } from "@/lib/safe-next";
import { StoreError } from "@/lib/store/errors";
import { getPool } from "@/lib/db/pool";
import type { KitStats, TerritoryEntry } from "@/lib/store/store";
import type { KitStatus } from "@/lib/store/types";
import { KIT_STATUSES } from "@/lib/store/types";

export type FormState = { ok: boolean; message: string } | null;

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const pool = getPool();
  const username = String(formData.get("username") ?? "");
  const res = await authenticate({
    store: authStore(), limiter: new SignInLimiter(dbFailureLog(pool)), username, password: String(formData.get("password") ?? ""), now: now(),
  });
  if (!res.ok) return { ok: false, message: res.message };
  const issuedAt = now().getTime();
  (await cookies()).set(COOKIE_NAME, signSession({ username: res.user.username, issuedAt, rev: res.user.rev }, sessionSecret()), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.floor(SESSION_MS / 1000),
  });
  await recordSignIn(pool, res.user.username, new Date(issuedAt).toISOString());
  const home = ROLE_HOMES[res.user.role];
  const next = safeNext(String(formData.get("next") ?? ""), home);
  redirect(res.mustChangePassword ? "/account/password" : next === "/" ? home : next);
}

export async function signOut() {
  (await cookies()).delete(COOKIE_NAME);
  redirect("/login");
}

/** Sets the person's own password. The first sign-in with a temporary password lands here; so does "My password". */
export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("account.change_password", { allowMustChange: true });
  if (!c.ok) return { ok: false, message: c.message };
  const { session, store } = c;
  const next = String(fd.get("new") ?? "");
  if (next !== String(fd.get("confirm") ?? "")) return { ok: false, message: "The two new passwords don't match." };
  const problem = passwordProblem(next, session.user.username);
  if (problem) return { ok: false, message: problem };
  const user = await authStore().getUser(session.user.username);
  if (!user) return { ok: false, message: "Your sign-in has ended. Sign in again." };
  if (!session.mustChangePassword) {
    const profile = await authStore().getProfile(user.username);
    if (!(await verifyPassword(String(fd.get("current") ?? ""), profile?.passwordHash))) return { ok: false, message: "Your current password isn't right." };
  }
  await store.setOwnPassword(await hashPassword(next), user.pwRev);
  redirect(session.home);
}

export type SaveKitResult =
  | { ok: true; kit: { id: string; title: string; status: KitStatus }; team: string | null; stats: KitStats; others: TerritoryEntry[] }
  | { ok: false; error: string };

const sayIt = (e: unknown, fallback: string) => (e instanceof StoreError ? e.message : fallback);

export async function saveKit(raw: { category: string; device: string; state: string; city: string; direction?: string; siteLang?: string }): Promise<SaveKitResult> {
  const c = await checkPerm("kits.save");
  if (!c.ok) return { ok: false, error: c.message };
  const v = validateKit(raw);
  if (!v.ok) return v;
  try {
    const kit = await c.store.createKit({
      category: v.value.category, device: v.value.device, state: v.value.state, city: v.value.city, cityIsFree: v.value.cityIsFree,
      direction: isDirectionId(raw.direction) ? raw.direction : "b",
      ...(v.value.siteLang ? { siteLang: v.value.siteLang } : {}),
    });
    const [stats, others] = await Promise.all([c.store.kitStats([kit]), c.store.territory(kit.category, kit.state, kit.city)]);
    revalidatePath("/kits");
    return { ok: true, kit: { id: kit.id, title: kit.title, status: kit.status }, team: c.session.team?.name ?? null, stats: stats.get(kit.id)!, others };
  } catch (e) {
    return { ok: false, error: sayIt(e, "We couldn't save the kit. Try again.") };
  }
}

export async function updateKit(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("kits.save");
  if (!c.ok) return { ok: false, message: c.message };
  const status = String(fd.get("status") ?? "") as KitStatus;
  if (!KIT_STATUSES.includes(status)) return { ok: false, message: "Choose a status." };
  try {
    await c.store.updateKit(String(fd.get("id") ?? ""), { title: String(fd.get("title") ?? ""), status });
  } catch (e) {
    return { ok: false, message: sayIt(e, "We couldn't save the kit. Try again.") };
  }
  revalidatePath("/kits", "layout");
  return { ok: true, message: "Saved." };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const c = await checkPerm("account.change_password");
  if (!c.ok) return { ok: false, message: c.message };
  await c.store.saveProfile({ defaultDevice: formData.get("default_device") === "mobile" ? "mobile" : "desktop" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function markSectionRead(sectionId: string): Promise<void> {
  const c = await checkPerm("playbook.read");
  if (!c.ok || !/^[a-z]{2,12}$/.test(sectionId)) return;
  await c.store.markRead(sectionId);
}

export async function currentHome(): Promise<string | null> {
  return (await getSession())?.home ?? null;
}

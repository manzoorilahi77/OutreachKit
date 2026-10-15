// Server-side gates for IT Prospects: the permission, then the workspace switch. Pages show the "switched off" note;
// actions and routes refuse in words.
import { checkPerm, requirePerm, storeFor } from "@/lib/auth/server";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { Session } from "@/lib/auth/session";
import type { Store } from "@/lib/store/store";

export const IT_OFF_MESSAGE = "IT Prospects is switched off for this workspace. Ask your super admin to turn it on.";

export async function itEnabled(store: Store): Promise<boolean> {
  return (await store.getWorkspace().catch(() => null))?.features.softwareTrack === true;
}

/** For pages: redirects without the permission, and says whether the area is on. */
export async function requireIt(key: PermissionKey): Promise<{ s: Session; store: Store; on: boolean }> {
  const s = await requirePerm(key);
  const store = storeFor(s);
  return { s, store, on: await itEnabled(store) };
}

export type ItChecked = { ok: true; session: Session; store: Store } | { ok: false; message: string };

/** For actions and routes: never redirects. */
export async function checkIt(key: PermissionKey): Promise<ItChecked> {
  const c = await checkPerm(key);
  if (!c.ok) return c;
  if (!(await itEnabled(c.store))) return { ok: false, message: IT_OFF_MESSAGE };
  return c;
}

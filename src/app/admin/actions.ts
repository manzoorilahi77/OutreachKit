"use server";

import { revalidatePath } from "next/cache";
import { generateTempPassword, hashPassword, passwordProblem } from "@/lib/auth/password";
import { isRole } from "@/lib/auth/roles";
import { checkPerm } from "@/lib/auth/server";
import { StoreError } from "@/lib/store/errors";
import type { Team, Workspace } from "@/lib/store/types";
import { cleanRates } from "@/lib/market/currency";

/** The result of an account action. `credentials` is shown once, in the browser, and never stored or logged. */
export type AccountState = { ok: boolean; message: string; credentials?: { fullName: string; username: string; password: string } } | null;

const say = (e: unknown, fallback: string) => (e instanceof StoreError ? e.message : fallback);

export async function createUserAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const c = await checkPerm("users.create");
  if (!c.ok) return { ok: false, message: c.message };
  const role = String(fd.get("role") ?? "");
  if (!isRole(role)) return { ok: false, message: "Choose a role." };
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const fullName = String(fd.get("fullName") ?? "").trim();
  const team = String(fd.get("team") ?? "") || null;
  // A password typed in the form is used as the temporary one; blank means the app makes one.
  const typed = String(fd.get("password") ?? "");
  const problem = typed ? passwordProblem(typed, username) : null;
  if (problem) return { ok: false, message: problem };
  const password = typed || generateTempPassword();
  try {
    await c.store.createUser({ username, fullName, role, team, tempPasswordHash: await hashPassword(password) });
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't create the account. Try again.") };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Created ${fullName}.`, credentials: { fullName, username, password } };
}

/** Reset password, suspend, disable, enable, change role, move team. Each one bumps the account's rev, which ends its sessions at the next request. */
export async function changeUserAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const c = await checkPerm("users.set_status");
  if (!c.ok) return { ok: false, message: c.message };
  const username = String(fd.get("username") ?? "");
  const type = String(fd.get("type") ?? "");
  try {
    let result: AccountState;
    switch (type) {
      case "reset_password": {
        const typed = String(fd.get("password") ?? "");
        const problem = typed ? passwordProblem(typed, username) : null;
        if (problem) return { ok: false, message: problem };
        const password = typed || generateTempPassword();
        const u = await c.store.changeUser(username, { type, tempPasswordHash: await hashPassword(password) });
        result = { ok: true, message: `New temporary password for ${u.fullName}.`, credentials: { fullName: u.fullName, username, password } };
        break;
      }
      case "suspend": {
        const u = await c.store.changeUser(username, { type, reason: String(fd.get("reason") ?? ""), until: String(fd.get("until") ?? "") || null });
        result = { ok: true, message: `${u.fullName} is paused.` };
        break;
      }
      case "disable": result = { ok: true, message: `${(await c.store.changeUser(username, { type })).fullName} is turned off.` }; break;
      case "enable": result = { ok: true, message: `${(await c.store.changeUser(username, { type })).fullName} can sign in again.` }; break;
      case "change_role": {
        const role = String(fd.get("role") ?? "");
        if (!isRole(role)) return { ok: false, message: "Choose a role." };
        result = { ok: true, message: `${(await c.store.changeUser(username, { type, role })).fullName} is now ${role.replace("_", " ")}.` };
        break;
      }
      case "move_team": result = { ok: true, message: `${(await c.store.changeUser(username, { type, team: String(fd.get("team") ?? "") || null })).fullName} moved.` }; break;
      default: return { ok: false, message: "Choose an action." };
    }
    revalidatePath("/", "layout");
    return result;
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't make that change. Try again.") };
  }
}

export async function saveTeamsAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const c = await checkPerm("workspace.manage");
  if (!c.ok) return { ok: false, message: c.message };
  const current = await c.store.getTeams();
  const teams: Team[] = [];
  const names = fd.getAll("name").map((v) => String(v).trim());
  const ids = fd.getAll("id").map(String);
  names.forEach((name, i) => {
    if (!name) return;
    teams.push({ id: ids[i] || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `team-${i + 1}`, name, managers: current.teams.find((t) => t.id === ids[i])?.managers ?? [] });
  });
  const removed = current.teams.filter((t) => !teams.some((x) => x.id === t.id));
  if (removed.length) return { ok: false, message: `Teams can't be removed, only renamed (${removed.map((t) => t.name).join(", ")}). People are filed under them.` };
  try {
    await c.store.saveTeams({ teams });
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the teams.") };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Teams saved." };
}

export async function saveWorkspaceAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const c = await checkPerm("workspace.manage");
  if (!c.ok) return { ok: false, message: c.message };
  const cur = await c.store.getWorkspace();
  const domain = String(fd.get("demoDomain") ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const next: Workspace = {
    ...cur,
    name: String(fd.get("name") ?? cur.name).trim().slice(0, 120),
    studio: String(fd.get("studio") ?? "").trim().slice(0, 120),
    demoDomain: domain.slice(0, 200),
    basedLine: String(fd.get("basedLine") ?? "").trim().slice(0, 200),
    markets: { rates: cleanRates({ CAD: Number(fd.get("rateCAD")), AED: Number(fd.get("rateAED")) }) },
  };
  try {
    await c.store.saveWorkspace(next);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the details.") };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Every kit uses these details from now on." };
}

export async function saveFeaturesAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const c = await checkPerm("content.approve");
  if (!c.ok) return { ok: false, message: c.message };
  const cur = await c.store.getWorkspace();
  await c.store.saveWorkspace({ ...cur, features: { leadFinder: fd.get("leadFinder") === "on", softwareTrack: fd.get("softwareTrack") === "on" } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Everyone gets the change now." };
}

export async function approveContentAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const c = await checkPerm("content.approve");
  if (!c.ok) return { ok: false, message: c.message };
  const kind = fd.get("kind") === "segment" ? "segment" : "category-kit";
  const fileId = String(fd.get("fileId") ?? "").trim();
  const version = String(fd.get("version") ?? "").trim();
  if (!/^[a-z0-9-]{1,80}$/.test(fileId) || !version) return { ok: false, message: "Choose a file and a version." };
  try {
    await c.store.addApproval({ kind, fileId, version, note: String(fd.get("note") ?? "").trim().slice(0, 300) });
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't record the approval.") };
  }
  revalidatePath("/platform/content");
  return { ok: true, message: `Approved ${fileId} version ${version}.` };
}

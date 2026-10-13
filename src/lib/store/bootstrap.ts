// Creates a team/ folder with the workspace and the owner's account, for the file Store's tests. (The server's version is mysqlBootstrap.ts, run by `pnpm db:init-owner`.)
import { randomUUID } from "node:crypto";
import path from "node:path";
import { listDir, readJson, writeJson, appendLine } from "./json";
import { layout, usernameProblem } from "./paths";
import { assertValid } from "./schemas";
import { SCHEMA_VERSION, type AuditEntry, type Profile, type TeamsFile, type UserFile, type Workspace } from "./types";

export interface InitInput {
  workspaceName: string;
  studio: string;
  demoDomain: string;
  basedLine?: string;
  username: string;
  fullName: string;
  /** bcrypt hash of the owner's chosen password. */
  passwordHash: string;
  /** bcrypt hash of a random secret nobody knows: the owner has no temporary password. */
  unusableTempHash: string;
  now?: Date;
}

/** True when team/users already holds a super admin. */
export async function hasSuperAdmin(root: string): Promise<boolean> {
  const L = layout(root);
  for (const f of await listDir(L.users)) {
    if (!f.endsWith(".json")) continue;
    const u = await readJson<{ role?: string }>(path.join(L.users, f));
    if (u?.role === "super_admin") return true;
  }
  return false;
}

export async function initTeam(root: string, i: InitInput): Promise<UserFile> {
  if (await hasSuperAdmin(root)) throw new Error("team/users already has a super admin. this runs once.");
  const problem = usernameProblem(i.username);
  if (problem) throw new Error(problem);
  if (!i.fullName.trim()) throw new Error("Add your full name.");
  const L = layout(root);
  const at = (i.now ?? new Date()).toISOString();
  const workspace: Workspace = {
    name: i.workspaceName.trim(), studio: i.studio.trim(), demoDomain: i.demoDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""),
    basedLine: (i.basedLine ?? "").trim(), features: { leadFinder: true, softwareTrack: false },
  };
  const user: UserFile = {
    username: i.username, fullName: i.fullName.trim(), role: "super_admin", team: null, status: "active", statusReason: "", suspendedUntil: null,
    tempPasswordHash: i.unusableTempHash, rev: 1, pwRev: 1, createdBy: i.username, createdAt: at, updatedAt: at,
  };
  const profile: Profile = { defaultDevice: "desktop", passwordHash: i.passwordHash, basedOnRev: user.pwRev };
  const teams: TeamsFile = { teams: [] };
  assertValid("schema", { version: SCHEMA_VERSION });
  assertValid("workspace", workspace);
  assertValid("teams", teams);
  assertValid("user", user);
  assertValid("profile", profile);
  await writeJson(L.schema, { version: SCHEMA_VERSION });
  await writeJson(L.workspace, workspace);
  await writeJson(L.teams, teams);
  await writeJson(L.userFile(user.username), user);
  await writeJson(L.profile(user.username), profile);
  const entry: AuditEntry = { id: randomUUID(), at, actor: user.username, action: "workspace.init", target: "workspace", detail: "" };
  await appendLine(L.audit(user.username), entry);
  return user;
}

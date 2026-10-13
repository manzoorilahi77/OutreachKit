// The database version of `team:init`: creates the workspace and the owner's account on an empty database. It runs once.
import { randomUUID } from "node:crypto";
import type { Pool } from "mysql2/promise";
import { toDbTime } from "@/lib/db/time";
import type { InitInput } from "./bootstrap";
import { usernameProblem } from "./paths";
import type { UserFile } from "./types";

export async function hasSuperAdminDb(pool: Pool): Promise<boolean> {
  const [r] = await pool.query<import("mysql2/promise").RowDataPacket[]>("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin'");
  return Number(r[0]?.n ?? 0) > 0;
}

export async function initWorkspaceDb(pool: Pool, i: InitInput): Promise<UserFile> {
  if (await hasSuperAdminDb(pool)) throw new Error("The database already has a super admin. This runs once.");
  const problem = usernameProblem(i.username);
  if (problem) throw new Error(problem);
  if (!i.fullName.trim()) throw new Error("Add your full name.");
  const at = (i.now ?? new Date()).toISOString();
  const user: UserFile = {
    username: i.username, fullName: i.fullName.trim(), role: "super_admin", team: null, status: "active", statusReason: "", suspendedUntil: null,
    tempPasswordHash: i.unusableTempHash, rev: 1, pwRev: 1, createdBy: i.username, createdAt: at, updatedAt: at,
  };
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    await c.query(
      `INSERT INTO workspace (id, name, studio, demo_domain, based_line, feature_lead_finder, feature_software_track, updated_at) VALUES (1, ?, ?, ?, ?, 1, 0, ?)`,
      [i.workspaceName.trim(), i.studio.trim(), i.demoDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""), (i.basedLine ?? "").trim(), toDbTime(at)],
    );
    await c.query(
      `INSERT INTO users (username, full_name, role, team, status, status_reason, suspended_until, temp_password_hash, rev, pw_rev, created_by, created_at, updated_at)
       VALUES (?, ?, 'super_admin', NULL, 'active', '', NULL, ?, 1, 1, ?, ?, ?)`,
      [user.username, user.fullName, user.tempPasswordHash, user.username, toDbTime(at), toDbTime(at)],
    );
    await c.query("INSERT INTO profiles (username, default_device, password_hash, based_on_rev) VALUES (?, 'desktop', ?, ?)", [user.username, i.passwordHash, user.pwRev]);
    await c.query("INSERT INTO audit_log (id, at, actor, action, target, detail) VALUES (?, ?, ?, 'workspace.init', 'workspace', '')", [randomUUID(), toDbTime(at), user.username]);
    await c.commit();
  } catch (e) {
    await c.rollback().catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  return user;
}

/**
 * The owner's way back in when a password is lost and nobody above that account can reset it (the super admin) or nobody is signed in.
 * Run from the server's terminal, not from the app. Sets the person's OWN password (so there is no forced change), ends their sessions,
 * lifts any sign-in lock, and writes an audit line. The caller passes a bcrypt hash; no password is stored or printed here.
 */
export async function setPasswordAsOperator(pool: Pool, username: string, passwordHash: string): Promise<void> {
  const problem = usernameProblem(username);
  if (problem) throw new Error(problem);
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [rows] = await c.query<import("mysql2/promise").RowDataPacket[]>("SELECT pw_rev FROM users WHERE username = ? FOR UPDATE", [username]);
    if (!rows[0]) throw new Error(`No account called "${username}".`);
    await c.query("UPDATE users SET rev = rev + 1, updated_at = ? WHERE username = ?", [toDbTime(new Date().toISOString()), username]);
    await c.query(
      `INSERT INTO profiles (username, default_device, password_hash, based_on_rev) VALUES (?, 'desktop', ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), based_on_rev = VALUES(based_on_rev)`,
      [username, passwordHash, rows[0].pw_rev],
    );
    await c.query("DELETE FROM signin_failures WHERE username_key = ?", [username]);
    await c.query("INSERT INTO audit_log (id, at, actor, action, target, detail) VALUES (?, ?, 'operator', 'account.password_set_by_operator', ?, 'from the server terminal')",
      [randomUUID(), toDbTime(new Date().toISOString()), username]);
    await c.commit();
  } catch (e) {
    await c.rollback().catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

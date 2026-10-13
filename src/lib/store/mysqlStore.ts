// The MySQL implementation of the Store (see store.ts). The server runs on this one; fileStore.ts is the reference
// implementation it must agree with (tests/contract). Rules that were checked in application code stay in application
// code (scope, roles, stage limits); the database adds what files could not: unique keys for duplicate leads, row locks
// for read-modify-write, and one transaction around every change with its audit line.
import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { canManage, ROLES, type Role } from "@/lib/auth/roles";
import { grantOf, limitOf, scopeOf, type Grant, type PermissionKey } from "@/lib/auth/permissions";
import { effectiveStatus, firstName } from "@/lib/auth/status";
import { nowIso, todayIso } from "@/lib/clock";
import { fromDbDate, fromDbTime, toDbDate, toDbTime } from "@/lib/db/time";
import { CHECK_FIELDS } from "@/lib/leads/checks";
import type { StageEvent } from "@/lib/leads/ratios";
import { SEQUENCE, stageChangePatch, touchPatch } from "@/lib/leads/sequence";
import { FLOW_RANK, STAGES, type Channel, type Stage } from "@/lib/leads/stages";
import type { BusinessRow } from "@/lib/scrape/types";
import { EMPTY_WORKSPACE } from "./defaults";
import { KEY_LABEL, dupKeys, finderKeys, type DupCandidate } from "./dupes";
import { StoreError } from "./errors";
import { applyForm, buildLead, toView, type NewLeadInput } from "./leadModel";
import { isId, usernameProblem } from "./paths";
import { assertValid } from "./schemas";
import type {
  DirectoryEntry, DupResult, FinderStore, Incoming, KitStats, LeadListItem, NewBusiness, NewUser, ScopeData, Store, TerritoryEntry, UserChange,
} from "./store";
import type {
  Actor, ApprovalRecord, Assignment, AuditEntry, KitRecord, KitStatus, Lead, LeadEvent, LeadView, PlaybookFile, Profile, TeamsFile, UserFile, Workspace,
} from "./types";

type Conn = Pool | PoolConnection;
type Row = RowDataPacket;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayOr = (d: string | undefined) => (d && ISO_DAY.test(d) ? d : todayIso());
const OPEN_EXCLUDED: Stage[] = ["won", "lost"];

// ---------- SQL plumbing ----------
async function rows(c: Conn, sql: string, params: unknown[] = []): Promise<Row[]> {
  const [r] = await c.query<RowDataPacket[]>(sql, params);
  return r;
}
async function exec(c: Conn, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [r] = await c.query<ResultSetHeader>(sql, params);
  return r;
}
const errno = (e: unknown): number | undefined => (e as { errno?: number } | null)?.errno;
const isDupEntry = (e: unknown) => errno(e) === 1062;
const bool = (v: unknown): boolean => v === 1 || v === true;
const nbool = (v: unknown): boolean | null => (v === null || v === undefined ? null : bool(v));
const nnum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const json = (v: unknown): string | null => (v === undefined || v === null ? null : JSON.stringify(v));
const parseJson = <T>(v: unknown): T | null => (v === null || v === undefined ? null : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

/** Thrown inside a transaction to roll it back and report "already there" to the caller. */
class KeyClash extends Error {}

/** A duplicate key is stored as is, unless it is too long for the index; then its tail is replaced by a hash. */
export function dbKey(k: string): string {
  return k.length <= 600 ? k : k.slice(0, 2) + "#" + createHash("sha1").update(k).digest("hex");
}

// ---------- row mappers ----------
const userOf = (r: Row): UserFile => ({
  username: r.username, fullName: r.full_name, role: r.role as Role, team: r.team, status: r.status, statusReason: r.status_reason,
  suspendedUntil: fromDbDate(r.suspended_until), tempPasswordHash: r.temp_password_hash, rev: Number(r.rev), pwRev: Number(r.pw_rev),
  createdBy: r.created_by, createdAt: fromDbTime(r.created_at), updatedAt: fromDbTime(r.updated_at),
});

const profileOf = (r: Row): Profile => {
  const health = parseJson<Record<string, unknown>>(r.outreach_health);
  return {
    defaultDevice: r.default_device, passwordHash: r.password_hash, basedOnRev: nnum(r.based_on_rev),
    ...(health ? { outreachHealth: health } : {}),
  };
};

const kitOf = (r: Row): KitRecord => ({
  id: r.id, owner: r.owner, title: r.title, status: r.status, category: r.category, device: r.device, state: r.state, city: r.city,
  city_is_free: bool(r.city_is_free), direction: r.direction, ...(r.site_lang ? { site_lang: r.site_lang } : {}),
  created_at: fromDbTime(r.created_at), updated_at: fromDbTime(r.updated_at),
});

export const LEAD_COLS = [
  "id", "owner", "assigned_to", "source_owner", "source_id", "kit_id", "date_sourced", "business_name", "owner_first_name", "category", "city", "state",
  "phone", "email", "instagram_handle", "facebook_page", "google_maps_url", "website_found", "website_url", "site_verdict", "google_review_count",
  "google_rating", "followers", "last_post_date", "demo_url", "demo_built_date", "first_contact_date", "channel", "replied", "stage", "next_action_date",
  "notes", "sequence_step", ...CHECK_FIELDS, "created_at", "updated_at",
] as const;

const leadOf = (r: Row): Lead => {
  const checks = Object.fromEntries(CHECK_FIELDS.map((f) => [f, bool(r[f])]));
  return {
    id: r.id, owner: r.owner, assignedTo: r.assigned_to, sourceRef: r.source_owner ? { owner: r.source_owner, id: r.source_id } : null, kit_id: r.kit_id,
    date_sourced: fromDbDate(r.date_sourced)!, business_name: r.business_name, owner_first_name: r.owner_first_name, category: r.category, city: r.city,
    state: r.state, phone: r.phone, email: r.email, instagram_handle: r.instagram_handle, facebook_page: r.facebook_page, google_maps_url: r.google_maps_url,
    website_found: nbool(r.website_found), website_url: r.website_url, site_verdict: r.site_verdict, google_review_count: nnum(r.google_review_count),
    google_rating: nnum(r.google_rating), followers: nnum(r.followers), last_post_date: fromDbDate(r.last_post_date), demo_url: r.demo_url,
    demo_built_date: fromDbDate(r.demo_built_date), first_contact_date: fromDbDate(r.first_contact_date), channel: r.channel as Channel | null,
    replied: bool(r.replied), stage: r.stage as Stage, next_action_date: fromDbDate(r.next_action_date), notes: r.notes, sequence_step: Number(r.sequence_step),
    created_at: fromDbTime(r.created_at), updated_at: fromDbTime(r.updated_at),
    ...checks,
  } as Lead;
};

export const leadValues = (l: Lead): unknown[] => {
  const o = l as unknown as Record<string, unknown>;
  return LEAD_COLS.map((col) => {
    switch (col) {
      case "assigned_to": return l.assignedTo;
      case "source_owner": return l.sourceRef?.owner ?? null;
      case "source_id": return l.sourceRef?.id ?? null;
      case "date_sourced": case "last_post_date": case "demo_built_date": case "first_contact_date": case "next_action_date": return toDbDate(o[col] as string | null);
      case "created_at": case "updated_at": return toDbTime(o[col] as string);
      case "website_found": return l.website_found === null ? null : l.website_found ? 1 : 0;
      case "replied": return l.replied ? 1 : 0;
      default: return typeof o[col] === "boolean" ? (o[col] ? 1 : 0) : o[col];
    }
  });
};

/** A lead field that doesn't fit its column is refused in words instead of failing in SQL. */
const LEAD_MAX: Partial<Record<keyof Lead, number>> = {
  business_name: 255, owner_first_name: 200, category: 200, city: 200, state: 10, phone: 100, email: 255, instagram_handle: 255, facebook_page: 500,
  google_maps_url: 1000, website_url: 1000, site_verdict: 500, demo_url: 1000,
};
export function fits(l: Lead) {
  for (const [k, max] of Object.entries(LEAD_MAX)) {
    if (String((l as unknown as Record<string, unknown>)[k] ?? "").length > max) throw new StoreError(`${k.replace(/_/g, " ")} is too long (${max} characters at most).`);
  }
}

const eventOf = (r: Row): LeadEvent => ({
  id: r.id, lead_owner: r.lead_owner, lead_id: r.lead_id, by: r.by_user, kind: r.kind, from_stage: r.from_stage, to_stage: r.to_stage, channel: r.channel,
  occurred_on: fromDbDate(r.occurred_on)!, note: r.note, created_at: fromDbTime(r.created_at),
});

const assignmentOf = (r: Row): Assignment => ({
  id: r.id, kind: r.kind, by: r.by_user, leadOwner: r.lead_owner, leadId: r.lead_id, business: r.business, to: r.to_user, at: fromDbTime(r.at),
});

const businessOf = (r: Row): BusinessRow => ({
  id: r.id, placeKey: r.place_key, scrapedOn: fromDbDate(r.scraped_on)!, scrapedAt: fromDbTime(r.scraped_at), query: r.query, category: r.category, city: r.city,
  state: r.state, name: r.name, phone: r.phone, address: r.address, mapsCategory: r.maps_category, rating: nnum(r.rating), reviewCount: nnum(r.review_count),
  email: r.email, facebookUrl: r.facebook_url, instagramUrl: r.instagram_url, otherLinks: parseJson<{ label: string; url: string }[]>(r.other_links) ?? [],
  mapsUrl: r.maps_url, movedLeadId: r.moved_lead_id,
});

/**
 * A lead as lists show it, with the latest assignment on it (the newest `at`, then the newest write), whether an accepted
 * copy owned by the assignee has taken its place, and whether any copy has replaced it.
 */
const ITEM_SQL = `SELECT l.*, a.id AS asg_id, a.kind AS asg_kind, a.by_user AS asg_by, a.business AS asg_business, a.to_user AS asg_to, a.at AS asg_at,
  EXISTS (SELECT 1 FROM leads c WHERE c.source_owner = l.owner AND c.source_id = l.id) AS superseded,
  (a.to_user IS NOT NULL AND EXISTS (SELECT 1 FROM leads x WHERE x.owner = a.to_user AND x.source_owner = l.owner AND x.source_id = l.id)) AS accepted
FROM leads l
LEFT JOIN assignments a ON a.seq = (SELECT a2.seq FROM assignments a2 WHERE a2.lead_owner = l.owner AND a2.lead_id = l.id ORDER BY a2.at DESC, a2.seq DESC LIMIT 1)`;

const itemOf = (r: Row): LeadListItem => ({
  ...toView(leadOf(r)),
  heldBy: r.asg_to ? r.asg_to : r.assigned_to,
  superseded: bool(r.superseded),
  pendingTo: r.asg_to && !bool(r.accepted) ? r.asg_to : null,
});

const NOT_SUPERSEDED = "NOT EXISTS (SELECT 1 FROM leads c WHERE c.source_owner = l.owner AND c.source_id = l.id)";

export class MySqlStore implements Store {
  constructor(private readonly pool: Pool, readonly actor: Actor | null) {}

  // ---------- plumbing ----------
  private me(): Actor {
    if (!this.actor) throw new StoreError("Sign in first.", "forbidden");
    return this.actor;
  }

  private need(key: PermissionKey): Grant {
    const g = grantOf(this.me(), key);
    if (g.scope === "none") throw new StoreError("Your role can't do that.", "forbidden");
    return g;
  }

  /** One transaction. Every statement sees what has been committed so far, so a lock taken first is a lock that counts. A deadlock is retried. */
  private async tx<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const c = await this.pool.getConnection();
      try {
        await c.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
        await c.beginTransaction();
        const out = await fn(c);
        await c.commit();
        return out;
      } catch (e) {
        await c.rollback().catch(() => {});
        if (errno(e) === 1213 && attempt < 3) continue;
        throw e;
      } finally {
        c.release();
      }
    }
  }

  private async audit(c: Conn, action: string, target: string, detail = ""): Promise<void> {
    const a = this.me();
    await exec(c, "INSERT INTO audit_log (id, at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)", [randomUUID(), toDbTime(nowIso()), a.username, action, target.slice(0, 255), detail]);
  }

  // ---------- who can see whom ----------
  private async owners(key: PermissionKey, c: Conn = this.pool): Promise<string[]> {
    const a = this.me();
    const scope = scopeOf(a, key);
    if (scope === "own" || scope === "queue") return [a.username];
    if (scope === "all") {
      // "All except the Super Admin's" (an Admin's leads and lead reports): the Super Admin's own data stays out.
      const hideOwner = limitOf(a, key) === "not_super_admin";
      return (await rows(c, hideOwner ? "SELECT username FROM users WHERE role <> 'super_admin' ORDER BY username" : "SELECT username FROM users ORDER BY username")).map((r) => r.username as string);
    }
    if (scope === "team") {
      if (a.team === null) return [a.username];
      const names = (await rows(c, "SELECT username FROM users WHERE team = ? ORDER BY username", [a.team])).map((r) => r.username as string);
      return names.includes(a.username) ? names : [...names, a.username];
    }
    return [];
  }

  private async holderName(c: Conn, username: string): Promise<string> {
    const r = (await rows(c, "SELECT full_name FROM users WHERE username = ?", [username]))[0];
    return r ? firstName(r.full_name, username) : username;
  }

  // ---------- workspace and teams ----------
  async getWorkspace(): Promise<Workspace> {
    this.me();
    const r = (await rows(this.pool, "SELECT * FROM workspace WHERE id = 1"))[0];
    if (!r) return EMPTY_WORKSPACE;
    const health = parseJson<Record<string, unknown>>(r.outreach_health);
    return {
      name: r.name, studio: r.studio, demoDomain: r.demo_domain, basedLine: r.based_line,
      features: { leadFinder: bool(r.feature_lead_finder), softwareTrack: bool(r.feature_software_track) },
      ...(r.rate_cad !== null && r.rate_aed !== null ? { markets: { rates: { CAD: Number(r.rate_cad), AED: Number(r.rate_aed) } } } : {}),
      ...(health ? { outreachHealth: health } : {}),
    };
  }

  async saveWorkspace(w: Workspace): Promise<void> {
    this.need("workspace.manage");
    assertValid("workspace", w);
    await this.tx(async (c) => {
      await exec(c, `INSERT INTO workspace (id, name, studio, demo_domain, based_line, feature_lead_finder, feature_software_track, rate_cad, rate_aed, outreach_health, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), studio = VALUES(studio), demo_domain = VALUES(demo_domain), based_line = VALUES(based_line),
          feature_lead_finder = VALUES(feature_lead_finder), feature_software_track = VALUES(feature_software_track), rate_cad = VALUES(rate_cad),
          rate_aed = VALUES(rate_aed), outreach_health = VALUES(outreach_health), updated_at = VALUES(updated_at)`,
      [w.name, w.studio, w.demoDomain, w.basedLine, w.features.leadFinder ? 1 : 0, w.features.softwareTrack ? 1 : 0, w.markets?.rates.CAD ?? null, w.markets?.rates.AED ?? null,
        json(w.outreachHealth), toDbTime(nowIso())]);
      await this.audit(c, "workspace.save", "workspace");
    });
  }

  private async teamsOn(c: Conn): Promise<TeamsFile> {
    const teams = await rows(c, "SELECT id, name FROM teams ORDER BY position");
    const managers = await rows(c, "SELECT team_id, username FROM team_managers ORDER BY team_id, position");
    return { teams: teams.map((t) => ({ id: t.id, name: t.name, managers: managers.filter((m) => m.team_id === t.id).map((m) => m.username as string) })) };
  }

  async getTeams(): Promise<TeamsFile> {
    this.me();
    return this.teamsOn(this.pool);
  }

  async saveTeams(t: TeamsFile): Promise<void> {
    this.need("workspace.manage");
    const ids = new Set<string>();
    for (const team of t.teams) {
      if (ids.has(team.id)) throw new StoreError("Two teams share the id " + team.id + ".");
      ids.add(team.id);
      if (team.name.length > 200) throw new StoreError("A team name can be 200 characters at most.");
    }
    assertValid("teams", t);
    await this.tx(async (c) => {
      await exec(c, "DELETE FROM team_managers");
      await exec(c, "DELETE FROM teams");
      for (const [i, team] of t.teams.entries()) {
        await exec(c, "INSERT INTO teams (id, name, position) VALUES (?, ?, ?)", [team.id, team.name, i]);
        for (const [j, m] of [...new Set(team.managers)].entries()) await exec(c, "INSERT INTO team_managers (team_id, username, position) VALUES (?, ?, ?)", [team.id, m, j]);
      }
      await this.audit(c, "teams.save", "teams", `${t.teams.length} teams`);
    });
  }

  // ---------- people ----------
  /** Raw reads for sign-in and sessions: the auth module needs a user before there is an actor. */
  async getUser(username: string): Promise<UserFile | null> {
    if (usernameProblem(username)) return null;
    const r = (await rows(this.pool, "SELECT * FROM users WHERE username = ?", [username]))[0];
    return r ? userOf(r) : null;
  }

  async getProfile(username: string): Promise<Profile | null> {
    if (usernameProblem(username)) return null;
    const r = (await rows(this.pool, "SELECT * FROM profiles WHERE username = ?", [username]))[0];
    return r ? profileOf(r) : null;
  }

  private async allUsers(c: Conn): Promise<UserFile[]> {
    return (await rows(c, "SELECT * FROM users")).map(userOf).sort((a, b) => a.username.localeCompare(b.username));
  }

  async listUsers(): Promise<UserFile[]> {
    this.need("users.create");
    return this.allUsers(this.pool);
  }

  async directory(): Promise<DirectoryEntry[]> {
    this.me();
    const today = todayIso();
    return (await this.allUsers(this.pool)).map((u) => ({
      username: u.username, fullName: u.fullName, firstName: firstName(u.fullName, u.username), role: u.role, team: u.team, status: effectiveStatus(u, today),
    }));
  }

  private async syncManagers(c: Conn, username: string, role: Role, team: string | null): Promise<void> {
    const { teams } = await this.teamsOn(c);
    for (const x of teams) {
      const has = x.managers.includes(username);
      const should = role === "manager" && team === x.id;
      let next: string[] | null = null;
      if (has && !should) next = x.managers.filter((m) => m !== username);
      else if (!has && should) next = [...x.managers, username].sort();
      if (!next) continue;
      await exec(c, "DELETE FROM team_managers WHERE team_id = ?", [x.id]);
      for (const [j, m] of next.entries()) await exec(c, "INSERT INTO team_managers (team_id, username, position) VALUES (?, ?, ?)", [x.id, m, j]);
    }
  }

  async createUser(input: NewUser): Promise<UserFile> {
    const a = this.me();
    this.need("users.create");
    if (!ROLES.includes(input.role) || !canManage(a.role, input.role)) throw new StoreError("You can't create an account with that role.", "forbidden");
    const problem = usernameProblem(input.username);
    if (problem) throw new StoreError(problem);
    const fullName = input.fullName.trim();
    if (!fullName || fullName.length > 120) throw new StoreError("Add the person's full name.");
    return this.tx(async (c) => {
      if ((await rows(c, "SELECT 1 FROM users WHERE username = ? FOR UPDATE", [input.username])).length) throw new StoreError("That username is taken.", "conflict");
      if (input.team !== null && !(await rows(c, "SELECT 1 FROM teams WHERE id = ?", [input.team])).length) throw new StoreError("That team doesn't exist.");
      const at = nowIso();
      const user: UserFile = {
        username: input.username, fullName, role: input.role, team: input.team, status: "active", statusReason: "", suspendedUntil: null,
        tempPasswordHash: input.tempPasswordHash, rev: 1, pwRev: 1, createdBy: a.username, createdAt: at, updatedAt: at,
      };
      try {
        await exec(c, `INSERT INTO users (username, full_name, role, team, status, status_reason, suspended_until, temp_password_hash, rev, pw_rev, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'active', '', NULL, ?, 1, 1, ?, ?, ?)`, [user.username, fullName, user.role, user.team, user.tempPasswordHash, a.username, toDbTime(at), toDbTime(at)]);
      } catch (e) {
        if (isDupEntry(e)) throw new StoreError("That username is taken.", "conflict");
        throw e;
      }
      await this.syncManagers(c, user.username, user.role, user.team);
      await this.audit(c, "user.create", user.username, `role ${user.role}`);
      return user;
    });
  }

  async changeUser(username: string, change: UserChange): Promise<UserFile> {
    const a = this.me();
    const key: PermissionKey = change.type === "reset_password" ? "users.reset_password" : change.type === "change_role" || change.type === "move_team" ? "users.change_role" : "users.set_status";
    this.need(key);
    return this.tx(async (c) => {
      const ur = usernameProblem(username) ? undefined : (await rows(c, "SELECT * FROM users WHERE username = ? FOR UPDATE", [username]))[0];
      if (!ur) throw new StoreError("That account wasn't found.", "not_found");
      const u = userOf(ur);
      if (u.username === a.username || !canManage(a.role, u.role)) throw new StoreError("You can't change that account.", "forbidden");
      const next: UserFile = { ...u, rev: u.rev + 1, updatedAt: nowIso() };
      let detail = "";
      switch (change.type) {
        case "reset_password":
          next.tempPasswordHash = change.tempPasswordHash;
          next.pwRev = next.rev;
          break;
        case "suspend":
          if (change.until && (!ISO_DAY.test(change.until) || change.until < todayIso())) throw new StoreError("The end date must be today or later.");
          next.status = "suspended";
          next.statusReason = change.reason.trim().slice(0, 300);
          next.suspendedUntil = change.until || null;
          detail = next.suspendedUntil ? `until ${next.suspendedUntil}` : "no end date";
          break;
        case "disable": {
          const open = await this.unhandedOn(c, u.username);
          if (open.length) throw new StoreError(`${firstName(u.fullName, u.username)} still has ${open.length} open lead${open.length === 1 ? "" : "s"} without a handover. Hand them over first.`, "conflict");
          next.status = "disabled";
          next.statusReason = "";
          next.suspendedUntil = null;
          break;
        }
        case "enable":
          next.status = "active";
          next.statusReason = "";
          next.suspendedUntil = null;
          break;
        case "change_role":
          if (!ROLES.includes(change.role) || !canManage(a.role, change.role)) throw new StoreError("You can't give that role.", "forbidden");
          next.role = change.role;
          detail = `${u.role} to ${change.role}`;
          break;
        case "move_team":
          if (change.team !== null && !(await rows(c, "SELECT 1 FROM teams WHERE id = ?", [change.team])).length) throw new StoreError("That team doesn't exist.");
          next.team = change.team;
          detail = `team ${change.team ?? "none"}`;
          break;
      }
      // The workspace always keeps one active admin or super admin. The admins are locked so two changes can't both remove the last one.
      const others = (await rows(c, "SELECT * FROM users WHERE role IN ('admin', 'super_admin') AND username <> ? FOR UPDATE", [u.username])).map(userOf);
      const after = [...others, next].filter((x) => (x.role === "admin" || x.role === "super_admin") && effectiveStatus(x, todayIso()) === "active");
      if (!after.length) throw new StoreError("The workspace needs at least one active admin.", "conflict");
      await exec(c, `UPDATE users SET role = ?, team = ?, status = ?, status_reason = ?, suspended_until = ?, temp_password_hash = ?, rev = ?, pw_rev = ?, updated_at = ? WHERE username = ?`,
        [next.role, next.team, next.status, next.statusReason, toDbDate(next.suspendedUntil), next.tempPasswordHash, next.rev, next.pwRev, toDbTime(next.updatedAt), u.username]);
      if (change.type === "change_role" || change.type === "move_team") await this.syncManagers(c, next.username, next.role, next.team);
      await this.audit(c, `user.${change.type}`, u.username, detail);
      return next;
    });
  }

  async saveProfile(patch: Partial<Pick<Profile, "defaultDevice" | "outreachHealth">>): Promise<Profile> {
    const a = this.me();
    return this.tx(async (c) => {
      const cur = (await rows(c, "SELECT * FROM profiles WHERE username = ? FOR UPDATE", [a.username]))[0];
      const base: Profile = cur ? profileOf(cur) : { defaultDevice: "desktop", passwordHash: null, basedOnRev: null };
      const next: Profile = { ...base, ...patch };
      assertValid("profile", next);
      await exec(c, `INSERT INTO profiles (username, default_device, password_hash, based_on_rev, outreach_health) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE default_device = VALUES(default_device), password_hash = VALUES(password_hash), based_on_rev = VALUES(based_on_rev), outreach_health = VALUES(outreach_health)`,
      [a.username, next.defaultDevice, next.passwordHash, next.basedOnRev, json(next.outreachHealth)]);
      return next;
    });
  }

  async setOwnPassword(passwordHash: string, basedOnRev: number): Promise<void> {
    const a = this.me();
    this.need("account.change_password");
    await this.tx(async (c) => {
      await exec(c, `INSERT INTO profiles (username, default_device, password_hash, based_on_rev) VALUES (?, 'desktop', ?, ?)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), based_on_rev = VALUES(based_on_rev)`, [a.username, passwordHash, basedOnRev]);
      await this.audit(c, "account.change_password", a.username);
    });
  }

  private async unhandedOn(c: Conn, username: string): Promise<LeadView[]> {
    const r = await rows(c, `SELECT l.* FROM leads l WHERE l.owner = ? AND l.stage NOT IN ('won', 'lost') AND ${NOT_SUPERSEDED}
      AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.lead_owner = l.owner AND a.lead_id = l.id) ORDER BY l.created_at, l.id`, [username]);
    return r.map((x) => toView(leadOf(x)));
  }

  async unhandedLeads(username: string): Promise<LeadView[]> {
    this.need("users.set_status");
    return this.unhandedOn(this.pool, username);
  }

  // ---------- kits ----------
  async createKit(input: { category: string; device: "desktop" | "mobile"; state: string; city: string; cityIsFree: boolean; direction: string; siteLang?: string; title?: string }): Promise<KitRecord> {
    const a = this.me();
    this.need("kits.save");
    const at = nowIso();
    const kit: KitRecord = {
      id: randomUUID(), owner: a.username, title: (input.title?.trim() || `${input.category} · ${input.city}, ${input.state}`).slice(0, 160), status: "active",
      category: input.category, device: input.device, state: input.state, city: input.city, city_is_free: input.cityIsFree, direction: input.direction,
      ...(input.siteLang ? { site_lang: input.siteLang } : {}),
      created_at: at, updated_at: at,
    };
    assertValid("kit", kit);
    await exec(this.pool, `INSERT INTO kits (id, owner, title, status, category, device, state, city, city_is_free, direction, site_lang, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [kit.id, kit.owner, kit.title, kit.status, kit.category, kit.device, kit.state, kit.city, kit.city_is_free ? 1 : 0, kit.direction, kit.site_lang ?? null, toDbTime(at), toDbTime(at)]);
    return kit;
  }

  async listKits(): Promise<KitRecord[]> {
    this.need("kits.view");
    const owners = await this.owners("kits.view");
    if (!owners.length) return [];
    return (await rows(this.pool, "SELECT * FROM kits WHERE owner IN (?) ORDER BY created_at DESC, id DESC", [owners])).map(kitOf);
  }

  async getKit(owner: string, id: string): Promise<KitRecord | null> {
    this.need("kits.view");
    if (!isId(id) || usernameProblem(owner)) return null;
    if (!(await this.owners("kits.view")).includes(owner)) return null;
    const r = (await rows(this.pool, "SELECT * FROM kits WHERE id = ? AND owner = ?", [id, owner]))[0];
    return r ? kitOf(r) : null;
  }

  async updateKit(id: string, patch: { title?: string; status?: KitStatus }): Promise<KitRecord> {
    const a = this.me();
    this.need("kits.save");
    if (!isId(id)) throw new StoreError("That kit wasn't found.", "not_found");
    return this.tx(async (c) => {
      const r = (await rows(c, "SELECT * FROM kits WHERE id = ? AND owner = ? FOR UPDATE", [id, a.username]))[0];
      if (!r) throw new StoreError("That kit wasn't found.", "not_found");
      const next: KitRecord = { ...kitOf(r), updated_at: nowIso() };
      if (patch.title !== undefined) {
        const t = patch.title.trim();
        if (!t) throw new StoreError("Give the kit a title.");
        next.title = t.slice(0, 160);
      }
      if (patch.status !== undefined) next.status = patch.status;
      assertValid("kit", next);
      await exec(c, "UPDATE kits SET title = ?, status = ?, updated_at = ? WHERE id = ?", [next.title, next.status, toDbTime(next.updated_at), id]);
      return next;
    });
  }

  async deleteKit(id: string): Promise<void> {
    const a = this.me();
    this.need("kits.save");
    if (!isId(id)) return;
    await exec(this.pool, "DELETE FROM kits WHERE id = ? AND owner = ?", [id, a.username]);
  }

  async territory(category: string, state: string, city: string): Promise<TerritoryEntry[]> {
    const a = this.me();
    this.need("kits.territory");
    const same = "LOWER(category) = LOWER(?) AND UPPER(state) = UPPER(?) AND LOWER(city) = LOWER(?)";
    const who = await rows(this.pool, `SELECT DISTINCT owner FROM kits WHERE owner <> ? AND status IN ('active', 'paused') AND ${same}`, [a.username, category, state, city]);
    if (!who.length) return [];
    const names = who.map((r) => r.owner as string);
    const users = await rows(this.pool, "SELECT username, full_name FROM users WHERE username IN (?)", [names]);
    const counts = await rows(this.pool, `SELECT owner, COUNT(*) AS n FROM leads l WHERE owner IN (?) AND ${same} AND ${NOT_SUPERSEDED} GROUP BY owner`, [names, category, state, city]);
    const out: TerritoryEntry[] = users.map((u) => ({
      username: u.username, name: firstName(u.full_name, u.username), leads: Number(counts.find((c) => c.owner === u.username)?.n ?? 0),
    }));
    return out.sort((x, y) => y.leads - x.leads || x.name.localeCompare(y.name));
  }

  async kitStats(kits: KitRecord[]): Promise<Map<string, KitStats>> {
    this.me();
    const out = new Map<string, KitStats>();
    const owners = [...new Set(kits.map((k) => k.owner))];
    const leads = owners.length ? (await rows(this.pool, `SELECT l.* FROM leads l WHERE l.owner IN (?) AND ${NOT_SUPERSEDED}`, [owners])).map(leadOf) : [];
    for (const k of kits) {
      const mine = leads.filter((l) => l.owner === k.owner &&
        (l.kit_id === k.id || (l.category.toLowerCase() === k.category.toLowerCase() && l.state.toUpperCase() === k.state.toUpperCase() && l.city.toLowerCase() === k.city.toLowerCase())));
      const due = mine.map((l) => l.next_action_date).filter((d): d is string => !!d).sort();
      const last = mine.map((l) => l.updated_at).sort().at(-1) ?? null;
      out.set(k.id, {
        leads: mine.length, contacted: mine.filter((l) => !!l.first_contact_date).length, replied: mine.filter((l) => l.replied).length,
        nextDue: due[0] ?? null, lastActivity: last && last > k.updated_at ? last : k.updated_at,
      });
    }
    return out;
  }

  // ---------- leads ----------
  /** The first lead that shares a key with `c`, most specific key first. A replaced lead (live = NULL) is not a hit. */
  private async duplicateOn(c: Conn, cand: DupCandidate, ignoreId?: string): Promise<DupResult | null> {
    const keys = dupKeys(cand);
    if (!keys.length) return null;
    const hits = await rows(c, `SELECT k.key_value, l.id, l.owner, l.assigned_to, l.business_name FROM lead_keys k JOIN leads l ON l.id = k.lead_id
      WHERE k.key_value IN (?) AND k.live = 1${ignoreId ? " AND k.lead_id <> ?" : ""}`, ignoreId ? [keys.map(dbKey), ignoreId] : [keys.map(dbKey)]);
    for (const key of keys) {
      const hit = hits.find((h) => h.key_value === dbKey(key));
      if (!hit) continue;
      const pending = (await rows(c, "SELECT to_user FROM assignments WHERE lead_owner = ? AND lead_id = ? ORDER BY at DESC, seq DESC LIMIT 1", [hit.owner, hit.id]))[0];
      const holder: string = pending?.to_user ?? hit.assigned_to ?? hit.owner;
      return { holder, holderName: await this.holderName(c, holder), businessName: hit.business_name, matchedOn: KEY_LABEL[key[0] as keyof typeof KEY_LABEL] };
    }
    return null;
  }

  async findDuplicate(cand: DupCandidate, opts?: { ignore?: { owner: string; id: string } }): Promise<DupResult | null> {
    this.me();
    return this.duplicateOn(this.pool, cand, opts?.ignore?.id);
  }

  async knownContacts(): Promise<{ email: string; phone: string; google_maps_url: string }[]> {
    this.need("leads.add");
    return (await rows(this.pool, `SELECT l.email, l.phone, l.google_maps_url FROM leads l WHERE ${NOT_SUPERSEDED}`)).map((r) => ({ email: r.email, phone: r.phone, google_maps_url: r.google_maps_url }));
  }

  private researcherCap(): boolean {
    return grantOf(this.me(), "leads.edit").limit === "to_qualified";
  }

  private assertStageAllowed(stage: Stage) {
    if (this.researcherCap() && (FLOW_RANK[stage] ?? 99) > FLOW_RANK.qualified!) {
      throw new StoreError("You can take a lead up to Qualified. A manager assigns it to a BD from there.", "forbidden");
    }
  }

  private dupMessage(name: string, d: DupResult): string {
    return d.holder === this.me().username ? `${name} is already your lead.` : `${name} is already ${d.holderName}'s lead.`;
  }

  private async checkNew(c: Conn, i: NewLeadInput, batch: DupCandidate[] = []): Promise<void> {
    if (i.stage) this.assertStageAllowed(i.stage);
    const dup = await this.duplicateOn(c, i);
    if (dup) throw new StoreError(this.dupMessage(i.business_name, dup), "duplicate");
    const keys = new Set(dupKeys(i));
    for (const b of batch) if (dupKeys(b).some((k) => keys.has(k))) throw new StoreError(`${i.business_name} appears twice in this batch.`, "duplicate");
  }

  /** Saves a lead's keys. The unique key is the guard: when another request got there first, say whose lead it is. */
  private async setKeys(c: Conn, lead: Lead, live: boolean): Promise<void> {
    await exec(c, "DELETE FROM lead_keys WHERE lead_id = ?", [lead.id]);
    const keys = [...new Set(dupKeys(lead).map(dbKey))];
    if (!keys.length) return;
    try {
      await exec(c, "INSERT INTO lead_keys (lead_id, key_value, live) VALUES ?", [keys.map((k) => [lead.id, k, live ? 1 : null])]);
    } catch (e) {
      if (!isDupEntry(e)) throw e;
      const dup = await this.duplicateOn(c, lead, lead.id);
      throw new StoreError(dup ? this.dupMessage(lead.business_name, dup) : `${lead.business_name} is already someone's lead.`, "duplicate");
    }
  }

  private async insertEvent(c: Conn, lead: Pick<Lead, "owner" | "id">, p: Partial<LeadEvent> & Pick<LeadEvent, "kind">): Promise<LeadEvent> {
    const ev: LeadEvent = {
      id: randomUUID(), lead_owner: lead.owner, lead_id: lead.id, by: this.me().username, from_stage: null, to_stage: null, channel: null,
      occurred_on: todayIso(), note: "", created_at: nowIso(), ...p,
    };
    await exec(c, `INSERT INTO lead_events (id, lead_owner, lead_id, by_user, kind, from_stage, to_stage, channel, occurred_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ev.id, ev.lead_owner, ev.lead_id, ev.by, ev.kind, ev.from_stage, ev.to_stage, ev.channel, toDbDate(ev.occurred_on), ev.note, toDbTime(ev.created_at)]);
    return ev;
  }

  private async writeNewLead(c: Conn, lead: Lead, note = ""): Promise<LeadView> {
    fits(lead);
    assertValid("lead", lead);
    await exec(c, `INSERT INTO leads (${LEAD_COLS.join(", ")}) VALUES (${LEAD_COLS.map(() => "?").join(", ")})`, leadValues(lead));
    await this.setKeys(c, lead, true);
    await this.insertEvent(c, lead, { kind: "stage_change", from_stage: null, to_stage: lead.stage, note, occurred_on: lead.date_sourced });
    return toView(lead);
  }

  private async saveLeadRow(c: Conn, lead: Lead): Promise<void> {
    fits(lead);
    assertValid("lead", lead);
    const cols = LEAD_COLS.filter((k) => k !== "id");
    const vals = leadValues(lead);
    await exec(c, `UPDATE leads SET ${cols.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, [...vals.slice(1), lead.id]);
  }

  async createLead(input: NewLeadInput): Promise<LeadView> {
    const a = this.me();
    const g = this.need("leads.add");
    return this.tx(async (c) => {
      await this.checkNew(c, input);
      let kit_id = input.kit_id ?? null;
      if (kit_id && !(isId(kit_id) && (await rows(c, "SELECT 1 FROM kits WHERE id = ? AND owner = ?", [kit_id, a.username])).length)) kit_id = null;
      const lead = buildLead({ ...input, kit_id }, { id: randomUUID(), owner: a.username, assignedTo: g.scope === "queue" ? null : a.username, today: todayIso(), nowIso: nowIso() });
      return this.writeNewLead(c, lead);
    });
  }

  async importLeads(inputs: NewLeadInput[]): Promise<{ added: number }> {
    const a = this.me();
    const g = this.need("leads.add");
    return this.tx(async (c) => {
      const seen: DupCandidate[] = [];
      for (const i of inputs) {
        await this.checkNew(c, i, seen);
        seen.push(i);
      }
      for (const i of inputs) {
        await this.writeNewLead(c, buildLead(i, { id: randomUUID(), owner: a.username, assignedTo: g.scope === "queue" ? null : a.username, today: todayIso(), nowIso: nowIso() }));
      }
      return { added: inputs.length };
    });
  }

  private async items(c: Conn, where: string, params: unknown[], order = "l.created_at, l.id"): Promise<LeadListItem[]> {
    return (await rows(c, `${ITEM_SQL} WHERE ${where} ORDER BY ${order}`, params)).map(itemOf);
  }

  async listLeads(opts?: { mine?: boolean }): Promise<LeadListItem[]> {
    const a = this.me();
    this.need("leads.view");
    const owners = opts?.mine ? [a.username] : await this.owners("leads.view");
    if (!owners.length) return [];
    return (await this.items(this.pool, "l.owner IN (?)", [owners])).filter((x) => opts?.mine || owners.length === 1 || !x.superseded);
  }

  async getLead(owner: string, id: string): Promise<LeadListItem | null> {
    this.need("leads.view");
    if (!isId(id) || usernameProblem(owner)) return null;
    if (!(await this.owners("leads.view")).includes(owner)) return null;
    return (await this.items(this.pool, "l.owner = ? AND l.id = ?", [owner, id]))[0] ?? null;
  }

  private async ownLead(c: Conn, id: string): Promise<Lead> {
    const a = this.me();
    if (!isId(id)) throw new StoreError("That lead wasn't found.", "not_found");
    const r = (await rows(c, "SELECT * FROM leads WHERE id = ? AND owner = ? FOR UPDATE", [id, a.username]))[0];
    if (!r) throw new StoreError("That lead wasn't found.", "not_found");
    return leadOf(r);
  }

  async updateLead(id: string, input: NewLeadInput): Promise<LeadView> {
    this.need("leads.edit");
    return this.tx(async (c) => {
      const lead = await this.ownLead(c, id);
      const next = applyForm(lead, input, { withOutreach: !this.researcherCap(), nowIso: nowIso() });
      await this.saveLeadRow(c, next);
      const replaced = (await rows(c, "SELECT 1 FROM leads WHERE source_owner = ? AND source_id = ? LIMIT 1", [lead.owner, lead.id])).length > 0;
      await this.setKeys(c, next, !replaced);
      return toView(next);
    });
  }

  async moveStage(id: string, to: Stage, day: string): Promise<LeadView> {
    this.need("leads.edit");
    if (!STAGES.some((s) => s.value === to)) throw new StoreError("Choose a stage.");
    this.assertStageAllowed(to);
    return this.tx(async (c) => {
      const lead = await this.ownLead(c, id);
      const d = dayOr(day);
      const next: Lead = { ...lead, ...stageChangePatch(lead, to, d), updated_at: nowIso() };
      if (to === "contacted" && lead.stage !== "contacted" && !lead.channel) next.channel = "instagram_dm";
      await this.saveLeadRow(c, next);
      if (to !== lead.stage) {
        await this.insertEvent(c, next, { kind: "stage_change", from_stage: lead.stage, to_stage: to, occurred_on: d });
        // The first message is the Day 0 touch.
        if (to === "contacted") await this.insertEvent(c, next, { kind: "touch", channel: lead.channel ?? "instagram_dm", occurred_on: d, note: SEQUENCE[0]!.title });
      }
      return toView(next);
    });
  }

  async logTouch(id: string, channel: Channel, day: string): Promise<LeadView> {
    this.need("leads.edit");
    if (this.researcherCap()) throw new StoreError("Researchers don't contact anyone.", "forbidden");
    return this.tx(async (c) => {
      const lead = await this.ownLead(c, id);
      if (!lead.first_contact_date) throw new StoreError("Move the lead to Contacted first.");
      if (lead.sequence_step >= SEQUENCE.length) throw new StoreError("Every step of the sequence is done.");
      const d = dayOr(day);
      const step = SEQUENCE[lead.sequence_step]!;
      const next: Lead = { ...lead, ...touchPatch(lead), updated_at: nowIso() };
      await this.insertEvent(c, next, { kind: "touch", channel, occurred_on: d, note: step.title });
      await this.saveLeadRow(c, next);
      return toView(next);
    });
  }

  async deleteLead(id: string): Promise<void> {
    this.need("leads.edit");
    await this.tx(async (c) => {
      const lead = await this.ownLead(c, id);
      await exec(c, "DELETE FROM leads WHERE id = ?", [lead.id]);
      // Deleting an accepted copy hands the lead back its keys (unless someone has taken them since).
      if (lead.sourceRef && !(await rows(c, "SELECT 1 FROM leads WHERE source_owner = ? AND source_id = ? LIMIT 1", [lead.sourceRef.owner, lead.sourceRef.id])).length) {
        await exec(c, "UPDATE IGNORE lead_keys SET live = 1 WHERE lead_id = ?", [lead.sourceRef.id]);
      }
    });
  }

  async addComment(owner: string, id: string, note: string, day: string): Promise<LeadEvent> {
    this.need("leads.comment");
    const lead = await this.getLead(owner, id);
    if (!lead || !(await this.owners("leads.comment")).includes(owner)) throw new StoreError("That lead wasn't found.", "not_found");
    const text = note.trim();
    if (!text) throw new StoreError("Write a comment first.");
    return this.tx((c) => this.insertEvent(c, { owner, id }, { kind: "comment", note: text.slice(0, 1000), occurred_on: dayOr(day) }));
  }

  async leadEvents(owner: string, id: string): Promise<LeadEvent[]> {
    this.need("leads.view");
    if (!(await this.getLead(owner, id))) return [];
    return (await rows(this.pool, `SELECT * FROM lead_events WHERE lead_owner = ? AND lead_id = ? AND (by_user = ? OR kind = 'comment') ORDER BY created_at DESC, id DESC`, [owner, id, owner])).map(eventOf);
  }

  async readScope(key: PermissionKey): Promise<ScopeData> {
    this.need(key);
    const owners = await this.owners(key);
    if (!owners.length) return { leads: [], events: [], owners };
    let leads = (await this.items(this.pool, "l.owner IN (?)", [owners])).filter((x) => owners.length === 1 || !x.superseded);
    const events = (await rows(this.pool, "SELECT * FROM lead_events WHERE by_user IN (?) ORDER BY seq", [owners])).map(eventOf);
    // "Totals only" (a viewer) never gets phone, email, social handles or notes: they are removed before they leave the Store.
    if (grantOf(this.me(), key).limit === "totals") {
      leads = leads.map((l) => ({ ...l, owner_first_name: "", phone: "", email: "", instagram_handle: "", facebook_page: "", google_maps_url: "", website_url: "", notes: "" }));
      return { leads, events: events.map((e) => ({ ...e, note: "" })), owners };
    }
    return { leads, events, owners };
  }

  async stageEvents(key: PermissionKey): Promise<StageEvent[]> {
    const { leads, events } = await this.readScope(key);
    const live = new Set(leads.map((l) => l.id));
    return events.filter((e) => e.kind === "stage_change" && live.has(e.lead_id)).map((e) => ({ lead_id: e.lead_id, to_stage: e.to_stage }));
  }

  async exportLeads(): Promise<LeadView[]> {
    this.need("leads.export");
    return this.tx(async (c) => {
      const owners = await this.owners("leads.export", c);
      const all = owners.length ? await this.items(c, "l.owner IN (?)", [owners]) : [];
      const out = all
        .filter((x) => owners.length === 1 || !x.superseded)
        .sort((x, y) => x.date_sourced.localeCompare(y.date_sourced) || x.created_at.localeCompare(y.created_at));
      await this.audit(c, "leads.export", "csv", `${out.length} leads`);
      return out;
    });
  }

  // ---------- hand-offs ----------
  async unassignedQueue(): Promise<LeadListItem[]> {
    this.need("leads.assign");
    const owners = await this.owners("leads.assign");
    if (!owners.length) return [];
    return this.items(this.pool, `l.owner IN (?) AND l.assigned_to IS NULL AND l.source_owner IS NULL AND a.id IS NULL`, [owners], "l.created_at DESC, l.id DESC");
  }

  async assignLead(owner: string, id: string, to: string, kind?: "assign" | "handover"): Promise<Assignment> {
    const a = this.me();
    this.need("leads.assign");
    return this.tx(async (c) => {
      const owners = await this.owners("leads.assign", c);
      const lr = usernameProblem(owner) || !isId(id) ? undefined : (await rows(c, "SELECT * FROM leads WHERE owner = ? AND id = ? FOR UPDATE", [owner, id]))[0];
      if (!lr || !owners.includes(owner)) throw new StoreError("That lead wasn't found.", "not_found");
      const lead = leadOf(lr);
      if ((await rows(c, "SELECT 1 FROM leads WHERE source_owner = ? AND source_id = ? LIMIT 1", [owner, id])).length) throw new StoreError("That lead has already moved on. Use the copy its new owner holds.", "conflict");
      if (OPEN_EXCLUDED.includes(lead.stage)) throw new StoreError("That lead is closed. Only open leads are handed over.");
      const tr = usernameProblem(to) ? undefined : (await rows(c, "SELECT * FROM users WHERE username = ?", [to]))[0];
      const target = tr ? userOf(tr) : null;
      if (!target || target.role !== "bd" || effectiveStatus(target, todayIso()) !== "active") throw new StoreError("Choose an active BD to take the lead.");
      if (scopeOf(a, "leads.assign") === "team" && target.team !== a.team) throw new StoreError("Choose a BD in your team.", "forbidden");
      if (target.username === lead.owner && lead.assignedTo === target.username) throw new StoreError("That BD already holds the lead.");
      const asg: Assignment = {
        id: randomUUID(), kind: kind ?? (lead.assignedTo === null ? "assign" : "handover"), by: a.username, leadOwner: owner, leadId: id,
        business: lead.business_name, to, at: nowIso(),
      };
      await exec(c, "INSERT INTO assignments (id, kind, by_user, lead_owner, lead_id, business, to_user, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [asg.id, asg.kind, asg.by, asg.leadOwner, asg.leadId, asg.business, asg.to, toDbTime(asg.at)]);
      await this.audit(c, asg.kind === "assign" ? "lead.assign" : "lead.handover", `${owner}/${id}`, `to ${to}`);
      return asg;
    });
  }

  private async incomingOn(c: Conn): Promise<Incoming[]> {
    const a = this.me();
    const r = await rows(c, `SELECT * FROM (${ITEM_SQL}) t WHERE t.asg_to = ? AND t.owner <> ? AND t.accepted = 0 ORDER BY t.asg_at DESC, t.asg_id DESC`, [a.username, a.username]);
    return r.map((x) => ({
      assignment: assignmentOf({ id: x.asg_id, kind: x.asg_kind, by_user: x.asg_by, lead_owner: x.owner, lead_id: x.id, business: x.asg_business, to_user: x.asg_to, at: x.asg_at } as Row),
      lead: toView(leadOf(x)),
      from: x.owner,
    }));
  }

  async incoming(): Promise<Incoming[]> {
    this.me();
    this.need("leads.edit");
    return this.incomingOn(this.pool);
  }

  async acceptAssignment(assignmentId: string): Promise<LeadView> {
    const a = this.me();
    this.need("leads.edit");
    return this.tx(async (c) => {
      const ref = (await rows(c, "SELECT lead_owner, lead_id FROM assignments WHERE id = ?", [assignmentId]))[0];
      if (!ref) throw new StoreError("That hand-off isn't waiting for you any more.", "not_found");
      // Two accepts of one hand-off meet at this lock; the second finds the first one's copy and stops.
      await rows(c, "SELECT id FROM leads WHERE owner = ? AND id = ? FOR UPDATE", [ref.lead_owner, ref.lead_id]);
      const pending = (await this.incomingOn(c)).find((i) => i.assignment.id === assignmentId);
      if (!pending) throw new StoreError("That hand-off isn't waiting for you any more.", "not_found");
      const src = pending.lead;
      const copy: Lead = {
        ...(leadOf((await rows(c, "SELECT * FROM leads WHERE id = ?", [src.id]))[0]!)), id: randomUUID(), owner: a.username, assignedTo: a.username,
        sourceRef: { owner: src.owner, id: src.id }, kit_id: null, created_at: nowIso(), updated_at: nowIso(),
      };
      // The original gives up its keys first, so the copy can take them.
      await exec(c, "UPDATE lead_keys SET live = NULL WHERE lead_id = ?", [src.id]);
      const view = await this.writeNewLead(c, copy, `Accepted from ${await this.holderName(c, src.owner)}`);
      await this.audit(c, "lead.accept", `${src.owner}/${src.id}`);
      return view;
    });
  }

  async listAssignments(): Promise<Assignment[]> {
    this.need("leads.assign");
    return (await rows(this.pool, "SELECT * FROM assignments ORDER BY at, seq")).map(assignmentOf);
  }

  // ---------- records ----------
  async listAudit(limit = 500): Promise<AuditEntry[]> {
    this.need("audit.view");
    return (await rows(this.pool, "SELECT * FROM audit_log ORDER BY at DESC, id DESC LIMIT ?", [Math.max(0, Math.floor(limit))])).map((r) => ({
      id: r.id, at: fromDbTime(r.at), actor: r.actor, action: r.action, target: r.target, detail: r.detail,
    }));
  }

  async getPlaybook(): Promise<PlaybookFile> {
    const a = this.me();
    const reads = await rows(this.pool, "SELECT section_id, read_at FROM playbook_reads WHERE username = ? ORDER BY read_at, section_id", [a.username]);
    const required = await rows(this.pool, "SELECT section_id FROM playbook_required WHERE username = ? ORDER BY section_id", [a.username]);
    return { reads: Object.fromEntries(reads.map((r) => [r.section_id, fromDbTime(r.read_at)])), required: required.map((r) => r.section_id as string) };
  }

  async markRead(sectionId: string): Promise<void> {
    const a = this.me();
    this.need("playbook.read");
    await exec(this.pool, "INSERT IGNORE INTO playbook_reads (username, section_id, read_at) VALUES (?, ?, ?)", [a.username, sectionId.slice(0, 80), toDbTime(nowIso())]);
  }

  async setRequired(sectionIds: string[]): Promise<void> {
    const a = this.me();
    this.need("playbook.required");
    const ids = [...new Set(sectionIds)].sort();
    await this.tx(async (c) => {
      await exec(c, "DELETE FROM playbook_required WHERE username = ?", [a.username]);
      if (ids.length) await exec(c, "INSERT INTO playbook_required (username, section_id) VALUES ?", [ids.map((s) => [a.username, s.slice(0, 80)])]);
      await this.audit(c, "playbook.required", "playbook", sectionIds.join(","));
    });
  }

  /** Who marked what as required, resolved per person: a manager's apply to their team, an admin's to everyone. */
  private async requiredMap(c: Conn): Promise<(username: string) => string[]> {
    const users = await this.allUsers(c);
    const marked = await rows(c, "SELECT username, section_id FROM playbook_required");
    return (username) => {
      const target = users.find((u) => u.username === username);
      if (!target) return [];
      const out = new Set<string>();
      for (const u of users) {
        const scope = scopeOf(u.role, "playbook.required");
        if (scope === "none") continue;
        if (scope === "team" && !(u.team !== null && u.team === target.team)) continue;
        for (const m of marked) if (m.username === u.username) out.add(m.section_id);
      }
      return [...out].sort();
    };
  }

  async requiredFor(username: string): Promise<string[]> {
    this.me();
    return (await this.requiredMap(this.pool))(username);
  }

  async playbookProgress(): Promise<{ user: DirectoryEntry; reads: Record<string, string>; required: string[] }[]> {
    this.need("playbook.required");
    const owners = new Set(await this.owners("playbook.required"));
    const requiredFor = await this.requiredMap(this.pool);
    const reads = await rows(this.pool, "SELECT username, section_id, read_at FROM playbook_reads ORDER BY read_at, section_id");
    return (await this.directory()).filter((d) => owners.has(d.username) && d.status !== "disabled").map((user) => ({
      user,
      reads: Object.fromEntries(reads.filter((r) => r.username === user.username).map((r) => [r.section_id, fromDbTime(r.read_at)])),
      required: requiredFor(user.username),
    }));
  }

  async listApprovals(): Promise<ApprovalRecord[]> {
    const a = this.me();
    this.need("content.approve");
    return (await rows(this.pool, "SELECT * FROM approvals WHERE owner = ? ORDER BY seq", [a.username])).map((r) => ({
      id: r.id, kind: r.kind, fileId: r.file_id, version: r.version, approvedAt: fromDbTime(r.approved_at), note: r.note,
    }));
  }

  async addApproval(rec: Omit<ApprovalRecord, "id" | "approvedAt">): Promise<ApprovalRecord> {
    const a = this.me();
    this.need("content.approve");
    const full: ApprovalRecord = { ...rec, id: randomUUID(), approvedAt: nowIso() };
    assertValid("approvals", { approvals: [full] });
    return this.tx(async (c) => {
      await exec(c, "INSERT INTO approvals (id, owner, kind, file_id, version, approved_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [full.id, a.username, full.kind, full.fileId, full.version, toDbTime(full.approvedAt), full.note]);
      await this.audit(c, "content.approve", `${rec.kind}:${rec.fileId}`, `version ${rec.version}`);
      return full;
    });
  }

  // ---------- lead finder ----------
  finder(): FinderStore {
    return {
      countSavedOn: async (day) => {
        this.need("finder.run");
        const r = (await rows(this.pool, "SELECT COUNT(*) AS n FROM finder_businesses WHERE owner = ? AND scraped_on = ?", [this.me().username, day]))[0];
        return Number(r?.n ?? 0);
      },
      existingPlaceKeys: async (keys) => {
        this.need("finder.run");
        if (!keys.length) return new Set<string>();
        const known = new Set<string>();
        for (const r of await rows(this.pool, "SELECT DISTINCT place_key FROM finder_businesses WHERE place_key IN (?)", [keys])) known.add(r.place_key);
        for (const r of await rows(this.pool, "SELECT key_value FROM lead_keys WHERE key_value IN (?) AND live = 1", [keys.map((k) => dbKey("m:" + k))])) {
          const k = keys.find((x) => dbKey("m:" + x) === r.key_value);
          if (k) known.add(k);
        }
        return known;
      },
      insertBusiness: async (b: NewBusiness) => {
        this.need("finder.run");
        const me = this.me().username;
        const keys = [...new Set(finderKeys(b).map(dbKey))];
        try {
          return await this.tx(async (c) => {
            if ((await rows(c, "SELECT 1 FROM lead_keys WHERE key_value IN (?) AND live = 1 LIMIT 1", [keys])).length) throw new KeyClash();
            const id = randomUUID();
            await exec(c, `INSERT INTO finder_businesses (id, owner, place_key, scraped_on, scraped_at, run_id, query, category, city, state, name, phone, address, maps_category,
              rating, review_count, email, facebook_url, instagram_url, other_links, maps_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, me, b.placeKey.slice(0, 512), b.scrapedOn, toDbTime(nowIso()), b.runId, b.query.slice(0, 300), b.category, b.city, b.state, b.name.slice(0, 255), b.phone.slice(0, 60),
              b.address.slice(0, 500), b.mapsCategory.slice(0, 200), b.rating, b.reviewCount, b.email.slice(0, 255), b.facebookUrl.slice(0, 500), b.instagramUrl.slice(0, 500),
              JSON.stringify(b.otherLinks), b.mapsUrl.slice(0, 1000)]);
            try {
              await exec(c, "INSERT INTO business_keys (business_id, key_value) VALUES ?", [keys.map((k) => [id, k])]);
            } catch (e) {
              if (isDupEntry(e)) throw new KeyClash();
              throw e;
            }
            return id;
          });
        } catch (e) {
          if (e instanceof KeyClash) return null;
          throw e;
        }
      },
      getBusiness: async (id) => {
        this.need("finder.run");
        const r = (await rows(this.pool, "SELECT * FROM finder_businesses WHERE id = ? AND owner = ?", [id, this.me().username]))[0];
        return r ? businessOf(r) : null;
      },
      listBusinesses: async (where, limit = 500) => {
        this.need("finder.run");
        return (await rows(this.pool, "SELECT * FROM finder_businesses WHERE owner = ? AND category = ? AND city = ? AND state = ? ORDER BY scraped_at DESC, id DESC LIMIT ?",
          [this.me().username, where.category, where.city, where.state, Math.max(0, Math.floor(limit))])).map(businessOf);
      },
      markMoved: async (id, leadId) => {
        this.need("finder.run");
        return this.tx(async (c) => {
          const r = (await rows(c, "SELECT moved_lead_id FROM finder_businesses WHERE id = ? AND owner = ? FOR UPDATE", [id, this.me().username]))[0];
          if (!r || r.moved_lead_id) return false;
          await exec(c, "UPDATE finder_businesses SET moved_lead_id = ?, moved_at = ? WHERE id = ?", [leadId.slice(0, 64), toDbTime(nowIso()), id]);
          return true;
        });
      },
      startRun: async (r) => {
        this.need("finder.run");
        const id = randomUUID();
        await exec(this.pool, "INSERT INTO finder_runs (id, owner, started_at, query, category, city, state, run_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [id, this.me().username, toDbTime(nowIso()), r.query.slice(0, 300), r.category, r.city, r.state, r.limit]);
        return id;
      },
      finishRun: async (id, c, stopReason) => {
        this.need("finder.run");
        await exec(this.pool, `UPDATE finder_runs SET finished_at = ?, found = ?, checked = ?, skipped_has_website = ?, skipped_duplicate = ?, saved = ?, stop_reason = ? WHERE id = ? AND owner = ?`,
          [toDbTime(nowIso()), c.found, c.checked, c.skippedHasWebsite, c.skippedDuplicate, c.saved, stopReason.slice(0, 500), id, this.me().username]);
      },
    };
  }
}

export function createMySqlStore(actor: Actor | null, pool: Pool): Store {
  return new MySqlStore(pool, actor);
}

// The file implementation of the Store over team/ (see store.ts). Nothing outside src/lib/store touches these files.
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { canManage, ROLES, type Role } from "@/lib/auth/roles";
import { can, grantOf, limitOf, scopeOf, type Grant, type PermissionKey } from "@/lib/auth/permissions";
import { effectiveStatus, firstName } from "@/lib/auth/status";
import { nowIso, todayIso } from "@/lib/clock";
import type { StageEvent } from "@/lib/leads/ratios";
import { SEQUENCE, stageChangePatch, touchPatch } from "@/lib/leads/sequence";
import { FLOW_RANK, STAGES, type Channel, type Stage } from "@/lib/leads/stages";
import { placeKey } from "@/lib/scrape/placeKey";
import type { BusinessRow } from "@/lib/scrape/types";
import { EMPTY_WORKSPACE } from "./defaults";
import { DupIndex, KEY_LABEL, dupKeys, finderKeys, type DupCandidate } from "./dupes";
import { StoreError } from "./errors";
import { appendLine, listDir, readJson, readLines, stableStringify, writeJson } from "./json";
import { applyForm, buildLead, toView, type NewLeadInput } from "./leadModel";
import { migrateData } from "./migrate";
import { ID_RE, isId, isInside, layout, rootDir, usernameProblem, type Layout } from "./paths";
import { assertValid, validateFile, type SchemaName } from "./schemas";
import type {
  DirectoryEntry, DupResult, FinderStore, Incoming, KitStats, LeadListItem, NewBusiness, NewUser, ScopeData, Store, TerritoryEntry, UserChange,
} from "./store";
import {
  SCHEMA_VERSION, type Actor, type ApprovalRecord, type ApprovalsFile, type Assignment, type AuditEntry, type FinderBusiness, type FinderLine,
  type FinderRunLine, type KitRecord, type KitStatus, type Lead, type LeadEvent, type LeadView, type PlaybookFile, type Profile, type TeamsFile,
  type UserFile, type Workspace,
} from "./types";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const dayOr = (d: string | undefined) => (d && ISO_DAY.test(d) ? d : todayIso());
const OPEN_EXCLUDED: Stage[] = ["won", "lost"];

export { EMPTY_WORKSPACE };

// ---- A short-lived picture of every folder on this laptop, for duplicate checks and team lists. Dropped on every local write and every sync.
interface Snapshot {
  at: number;
  users: UserFile[];
  leads: Lead[];
  assignments: Assignment[];
  businesses: (FinderBusiness & { movedLeadId: string | null; owner: string })[];
  /** "owner/id" of the latest assignment for each lead. */
  latestAssignment: Map<string, Assignment>;
  /** "owner/id" of every lead that an accepted copy has replaced. */
  supersededKeys: Set<string>;
  dup?: DupIndex;
}
// Kept on globalThis: Next can bundle route handlers and server actions separately, and a write in one must drop the other's picture.
const g = globalThis as { __okitSnapshots?: Map<string, Snapshot>; __okitLocks?: Map<string, Promise<unknown>> };
const snapshots = (g.__okitSnapshots ??= new Map<string, Snapshot>());
const SNAPSHOT_TTL_MS = 3000;
export const invalidateStore = (root?: string) => (root ? snapshots.delete(root) : snapshots.clear());

const locks = (g.__okitLocks ??= new Map<string, Promise<unknown>>());
/** One writer at a time per repo in this process, so two requests can't both read a lead, change it and overwrite each other. */
function withLock<T>(root: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(root) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(root, run.catch(() => {}));
  return run;
}

const leadKey = (owner: string, id: string) => `${owner}/${id}`;

class FileStore implements Store {
  readonly L: Layout;
  constructor(readonly root: string, readonly actor: Actor | null) {
    this.L = layout(root);
  }

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

  private async schemaVersion(): Promise<number> {
    const s = await readJson<{ version?: number }>(this.L.schema);
    return typeof s?.version === "number" ? s.version : SCHEMA_VERSION;
  }

  private async load<T>(kind: SchemaName, file: string, version?: number): Promise<T | null> {
    const raw = await readJson(file);
    if (raw === null) return null;
    const data = migrateData(kind, raw, version ?? (await this.schemaVersion()));
    return validateFile(kind, data).ok ? (data as T) : null;
  }

  /** The write guard: a person writes only their own folder; admins also write the account files they may. */
  private guard(file: string) {
    const a = this.me();
    const L = this.L;
    if (isInside(L.data(a.username), file)) return;
    if (isInside(L.users, file) && can(a, "users.create")) return;
    if ((file === L.workspace || file === L.teams) && can(a, "workspace.manage")) return;
    throw new StoreError("You can't change that.", "forbidden");
  }

  private async put(kind: SchemaName, file: string, data: unknown) {
    this.guard(file);
    assertValid(kind, data);
    await writeJson(file, data);
    invalidateStore(this.root);
  }

  private async append(kind: SchemaName, file: string, line: unknown) {
    this.guard(file);
    assertValid(kind, line);
    await appendLine(file, line);
    invalidateStore(this.root);
  }

  private locked<T>(fn: () => Promise<T>): Promise<T> {
    return withLock(this.root, fn);
  }

  private async audit(action: string, target: string, detail = "") {
    const a = this.me();
    const entry: AuditEntry = { id: randomUUID(), at: nowIso(), actor: a.username, action, target, detail };
    await this.append("audit", this.L.audit(a.username), entry);
  }

  // ---------- snapshot ----------
  private async snapshot(): Promise<Snapshot> {
    const hit = snapshots.get(this.root);
    if (hit && Date.now() - hit.at < SNAPSHOT_TTL_MS) return hit;
    const version = await this.schemaVersion();
    const users = await this.readUsers(version);
    const leads: Lead[] = [];
    const assignments: Assignment[] = [];
    const businesses: Snapshot["businesses"] = [];
    for (const u of users) {
      const dir = this.L.leadsDir(u.username);
      for (const f of await listDir(dir)) {
        if (!f.endsWith(".json") || f.startsWith(".")) continue;
        const l = await this.load<Lead>("lead", path.join(dir, f), version);
        if (l && l.owner === u.username) leads.push(l);
      }
      for (const a of await readLines<Assignment>(this.L.assignments(u.username))) if (validateFile("assignment", a).ok) assignments.push(a);
      const moved = new Map<string, string>();
      const lines = await readLines<FinderLine>(this.L.finderBusinesses(u.username));
      for (const ln of lines) if (ln.kind === "moved") moved.set(ln.id, ln.leadId);
      for (const ln of lines) {
        if (ln.kind !== "business" || validateFile("finderLine", ln).ok === false) continue;
        const { kind: _k, ...b } = ln;
        void _k;
        businesses.push({ ...b, owner: u.username, movedLeadId: moved.get(b.id) ?? null });
      }
    }
    assignments.sort((a, b) => a.at.localeCompare(b.at));
    const latestAssignment = new Map<string, Assignment>();
    for (const a of assignments) latestAssignment.set(leadKey(a.leadOwner, a.leadId), a);
    const supersededKeys = new Set<string>();
    for (const l of leads) if (l.sourceRef) supersededKeys.add(leadKey(l.sourceRef.owner, l.sourceRef.id));
    const snap: Snapshot = { at: Date.now(), users, leads, assignments, businesses, latestAssignment, supersededKeys };
    snapshots.set(this.root, snap);
    return snap;
  }

  private async readUsers(version?: number): Promise<UserFile[]> {
    const v = version ?? (await this.schemaVersion());
    const out: UserFile[] = [];
    for (const f of await listDir(this.L.users)) {
      if (!f.endsWith(".json") || f.startsWith(".")) continue;
      const u = await this.load<UserFile>("user", path.join(this.L.users, f), v);
      if (u && `${u.username}.json` === f) out.push(u);
    }
    return out.sort((a, b) => a.username.localeCompare(b.username));
  }

  private dupIndex(s: Snapshot): DupIndex {
    if (s.dup) return s.dup;
    const idx = new DupIndex();
    const nameOf = (u: string) => u;
    for (const l of s.leads) {
      const k = leadKey(l.owner, l.id);
      if (s.supersededKeys.has(k)) continue;
      const pending = s.latestAssignment.get(k);
      idx.add(dupKeys(l), pending?.to ?? l.assignedTo ?? nameOf(l.owner), l.business_name, "lead:" + k);
    }
    s.dup = idx;
    return idx;
  }

  private async holderName(username: string): Promise<string> {
    const u = (await this.snapshot()).users.find((x) => x.username === username);
    return u ? firstName(u.fullName, u.username) : username;
  }

  // ---------- who can see whom ----------
  private async owners(key: PermissionKey): Promise<string[]> {
    const a = this.me();
    const scope = scopeOf(a, key);
    const users = (await this.snapshot()).users;
    if (scope === "all") {
      // "All except the Super Admin's" (an Admin's leads and lead reports): the Super Admin's own data stays out.
      const hideOwner = limitOf(a, key) === "not_super_admin";
      return users.filter((u) => !(hideOwner && u.role === "super_admin")).map((u) => u.username);
    }
    if (scope === "team") {
      const names = users.filter((u) => a.team !== null && u.team === a.team).map((u) => u.username);
      return names.includes(a.username) ? names : [...names, a.username];
    }
    if (scope === "own" || scope === "queue") return [a.username];
    return [];
  }

  private item(s: Snapshot, l: Lead): LeadListItem {
    const k = leadKey(l.owner, l.id);
    const asg = s.latestAssignment.get(k);
    const accepted = asg ? s.leads.some((x) => x.owner === asg.to && x.sourceRef?.owner === l.owner && x.sourceRef.id === l.id) : false;
    return {
      ...toView(l),
      heldBy: asg ? asg.to : l.assignedTo,
      superseded: s.supersededKeys.has(k),
      pendingTo: asg && !accepted ? asg.to : null,
    };
  }

  // ---------- workspace and teams ----------
  async getWorkspace(): Promise<Workspace> {
    this.me();
    return (await this.load<Workspace>("workspace", this.L.workspace)) ?? EMPTY_WORKSPACE;
  }
  async saveWorkspace(w: Workspace): Promise<void> {
    return this.locked(async () => {
      this.need("workspace.manage");
      await this.put("workspace", this.L.workspace, w);
      await this.audit("workspace.save", "workspace", "");
    });
  }
  async getTeams(): Promise<TeamsFile> {
    this.me();
    return (await this.load<TeamsFile>("teams", this.L.teams)) ?? { teams: [] };
  }
  async saveTeams(t: TeamsFile): Promise<void> {
    return this.locked(async () => {
      this.need("workspace.manage");
      const ids = new Set<string>();
      for (const team of t.teams) {
        if (ids.has(team.id)) throw new StoreError("Two teams share the id " + team.id + ".");
        ids.add(team.id);
      }
      await this.put("teams", this.L.teams, t);
      await this.audit("teams.save", "teams", `${t.teams.length} teams`);
    });
  }

  // ---------- people ----------
  /** Raw reads for sign-in and sessions: the auth module needs a user before there is an actor. */
  async getUser(username: string): Promise<UserFile | null> {
    if (usernameProblem(username)) return null;
    return this.load<UserFile>("user", this.L.userFile(username));
  }
  async getProfile(username: string): Promise<Profile | null> {
    if (usernameProblem(username)) return null;
    return this.load<Profile>("profile", this.L.profile(username));
  }
  async listUsers(): Promise<UserFile[]> {
    this.need("users.create");
    return (await this.snapshot()).users;
  }
  async directory(): Promise<DirectoryEntry[]> {
    this.me();
    return (await this.snapshot()).users.map((u) => ({
      username: u.username, fullName: u.fullName, firstName: firstName(u.fullName, u.username), role: u.role, team: u.team, status: effectiveStatus(u, todayIso()),
    }));
  }

  private async syncManagers(username: string, role: Role, team: string | null) {
    const t = await this.getTeams();
    let changed = false;
    const teams = t.teams.map((x) => {
      const has = x.managers.includes(username);
      const should = role === "manager" && team === x.id;
      if (has && !should) { changed = true; return { ...x, managers: x.managers.filter((m) => m !== username) }; }
      if (!has && should) { changed = true; return { ...x, managers: [...x.managers, username].sort() }; }
      return x;
    });
    if (changed) await this.put("teams", this.L.teams, { teams });
  }

  async createUser(input: NewUser): Promise<UserFile> {
    return this.locked(async () => {
      const a = this.me();
      this.need("users.create");
      if (!ROLES.includes(input.role) || !canManage(a.role, input.role)) throw new StoreError("You can't create an account with that role.", "forbidden");
      const problem = usernameProblem(input.username);
      if (problem) throw new StoreError(problem);
      const fullName = input.fullName.trim();
      if (!fullName || fullName.length > 120) throw new StoreError("Add the person's full name.");
      if ((await this.getUser(input.username)) || (await readJson(this.L.userFile(input.username)))) throw new StoreError("That username is taken.", "conflict");
      if (input.team !== null && !(await this.getTeams()).teams.some((t) => t.id === input.team)) throw new StoreError("That team doesn't exist.");
      const at = nowIso();
      const user: UserFile = {
        username: input.username, fullName, role: input.role, team: input.team, status: "active", statusReason: "", suspendedUntil: null,
        tempPasswordHash: input.tempPasswordHash, rev: 1, pwRev: 1, createdBy: a.username, createdAt: at, updatedAt: at,
      };
      await this.put("user", this.L.userFile(user.username), user);
      await this.syncManagers(user.username, user.role, user.team);
      await this.audit("user.create", user.username, `role ${user.role}`);
      return user;
    });
  }

  async changeUser(username: string, change: UserChange): Promise<UserFile> {
    return this.locked(async () => {
      const a = this.me();
      const key: PermissionKey = change.type === "reset_password" ? "users.reset_password" : change.type === "change_role" || change.type === "move_team" ? "users.change_role" : "users.set_status";
      this.need(key);
      const u = await this.getUser(username);
      if (!u) throw new StoreError("That account wasn't found.", "not_found");
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
          const open = await this.unhandedLeads(u.username);
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
          if (change.team !== null && !(await this.getTeams()).teams.some((t) => t.id === change.team)) throw new StoreError("That team doesn't exist.");
          next.team = change.team;
          detail = `team ${change.team ?? "none"}`;
          break;
      }
      // The workspace always keeps one active admin or super admin.
      const others = (await this.snapshot()).users.filter((x) => x.username !== u.username);
      const after = [...others, next].filter((x) => (x.role === "admin" || x.role === "super_admin") && effectiveStatus(x, todayIso()) === "active");
      if (!after.length) throw new StoreError("The workspace needs at least one active admin.", "conflict");
      await this.put("user", this.L.userFile(u.username), next);
      if (change.type === "change_role" || change.type === "move_team") await this.syncManagers(next.username, next.role, next.team);
      await this.audit(`user.${change.type}`, u.username, detail);
      return next;
    });
  }

  async saveProfile(patch: Partial<Pick<Profile, "defaultDevice" | "outreachHealth">>): Promise<Profile> {
    return this.locked(async () => {
      const a = this.me();
      const cur = (await this.getProfile(a.username)) ?? { defaultDevice: "desktop" as const, passwordHash: null, basedOnRev: null };
      const next: Profile = { ...cur, ...patch };
      await this.put("profile", this.L.profile(a.username), next);
      return next;
    });
  }

  async setOwnPassword(passwordHash: string, basedOnRev: number): Promise<void> {
    return this.locked(async () => {
      const a = this.me();
      this.need("account.change_password");
      const cur = (await this.getProfile(a.username)) ?? { defaultDevice: "desktop" as const, passwordHash: null, basedOnRev: null };
      await this.put("profile", this.L.profile(a.username), { ...cur, passwordHash, basedOnRev });
      await this.audit("account.change_password", a.username, "");
    });
  }

  async unhandedLeads(username: string): Promise<LeadView[]> {
    this.need("users.set_status");
    const s = await this.snapshot();
    return s.leads
      .filter((l) => l.owner === username && !OPEN_EXCLUDED.includes(l.stage) && !s.latestAssignment.has(leadKey(l.owner, l.id)) && !s.supersededKeys.has(leadKey(l.owner, l.id)))
      .map(toView);
  }

  // ---------- kits ----------
  async createKit(input: { category: string; device: "desktop" | "mobile"; state: string; city: string; cityIsFree: boolean; direction: string; siteLang?: string; title?: string }): Promise<KitRecord> {
    return this.locked(async () => {
      const a = this.me();
      this.need("kits.save");
      const at = nowIso();
      const kit: KitRecord = {
        id: randomUUID(), owner: a.username, title: (input.title?.trim() || `${input.category} · ${input.city}, ${input.state}`).slice(0, 160), status: "active",
        category: input.category, device: input.device, state: input.state, city: input.city, city_is_free: input.cityIsFree, direction: input.direction,
        ...(input.siteLang ? { site_lang: input.siteLang } : {}),
        created_at: at, updated_at: at,
      };
      await this.put("kit", this.L.kit(a.username, kit.id), kit);
      return kit;
    });
  }

  private async readKits(owners: string[]): Promise<KitRecord[]> {
    const v = await this.schemaVersion();
    const out: KitRecord[] = [];
    for (const o of owners) {
      const dir = this.L.kitsDir(o);
      for (const f of await listDir(dir)) {
        if (!f.endsWith(".json") || f.startsWith(".")) continue;
        const k = await this.load<KitRecord>("kit", path.join(dir, f), v);
        if (k && k.owner === o) out.push(k);
      }
    }
    return out.sort((x, y) => y.created_at.localeCompare(x.created_at));
  }

  async listKits(): Promise<KitRecord[]> {
    this.need("kits.view");
    return this.readKits(await this.owners("kits.view"));
  }
  async getKit(owner: string, id: string): Promise<KitRecord | null> {
    this.need("kits.view");
    if (!isId(id) || usernameProblem(owner)) return null;
    if (!(await this.owners("kits.view")).includes(owner)) return null;
    return this.load<KitRecord>("kit", this.L.kit(owner, id));
  }
  async updateKit(id: string, patch: { title?: string; status?: KitStatus }): Promise<KitRecord> {
    return this.locked(async () => {
      const a = this.me();
      this.need("kits.save");
      if (!isId(id)) throw new StoreError("That kit wasn't found.", "not_found");
      const k = await this.load<KitRecord>("kit", this.L.kit(a.username, id));
      if (!k) throw new StoreError("That kit wasn't found.", "not_found");
      const next: KitRecord = { ...k, updated_at: nowIso() };
      if (patch.title !== undefined) {
        const t = patch.title.trim();
        if (!t) throw new StoreError("Give the kit a title.");
        next.title = t.slice(0, 160);
      }
      if (patch.status !== undefined) next.status = patch.status;
      await this.put("kit", this.L.kit(a.username, id), next);
      return next;
    });
  }
  async deleteKit(id: string): Promise<void> {
    return this.locked(async () => {
      const a = this.me();
      this.need("kits.save");
      if (!isId(id)) return;
      this.guard(this.L.kit(a.username, id));
      await rm(this.L.kit(a.username, id), { force: true });
      invalidateStore(this.root);
    });
  }

  async territory(category: string, state: string, city: string): Promise<TerritoryEntry[]> {
    const a = this.me();
    this.need("kits.territory");
    const s = await this.snapshot();
    const same = (c: string, st: string, ci: string) => c.toLowerCase() === category.toLowerCase() && st.toUpperCase() === state.toUpperCase() && ci.toLowerCase() === city.toLowerCase();
    const out: TerritoryEntry[] = [];
    for (const u of s.users) {
      if (u.username === a.username) continue;
      const kits = (await this.readKits([u.username])).filter((k) => (k.status === "active" || k.status === "paused") && same(k.category, k.state, k.city));
      if (!kits.length) continue;
      const leads = s.leads.filter((l) => l.owner === u.username && same(l.category, l.state, l.city) && !s.supersededKeys.has(leadKey(l.owner, l.id))).length;
      out.push({ username: u.username, name: firstName(u.fullName, u.username), leads });
    }
    return out.sort((x, y) => y.leads - x.leads || x.name.localeCompare(y.name));
  }

  async kitStats(kits: KitRecord[]): Promise<Map<string, KitStats>> {
    this.me();
    const s = await this.snapshot();
    const out = new Map<string, KitStats>();
    for (const k of kits) {
      const leads = s.leads.filter((l) => l.owner === k.owner && !s.supersededKeys.has(leadKey(l.owner, l.id)) &&
        (l.kit_id === k.id || (l.category.toLowerCase() === k.category.toLowerCase() && l.state.toUpperCase() === k.state.toUpperCase() && l.city.toLowerCase() === k.city.toLowerCase())));
      const due = leads.map((l) => l.next_action_date).filter((d): d is string => !!d).sort();
      const last = leads.map((l) => l.updated_at).sort().at(-1) ?? null;
      out.set(k.id, {
        leads: leads.length, contacted: leads.filter((l) => !!l.first_contact_date).length, replied: leads.filter((l) => l.replied).length,
        nextDue: due[0] ?? null, lastActivity: last && last > k.updated_at ? last : k.updated_at,
      });
    }
    return out;
  }

  // ---------- leads ----------
  async findDuplicate(c: DupCandidate, opts?: { ignore?: { owner: string; id: string } }): Promise<DupResult | null> {
    this.me();
    const s = await this.snapshot();
    const ignore = new Set(opts?.ignore ? ["lead:" + leadKey(opts.ignore.owner, opts.ignore.id)] : []);
    const hit = this.dupIndex(s).find(dupKeys(c), ignore);
    if (!hit) return null;
    return { holder: hit.holder, holderName: await this.holderName(hit.holder), businessName: hit.businessName, matchedOn: KEY_LABEL[hit.kind] };
  }

  async knownContacts(): Promise<{ email: string; phone: string; google_maps_url: string }[]> {
    this.need("leads.add");
    const s = await this.snapshot();
    return s.leads.filter((l) => !s.supersededKeys.has(leadKey(l.owner, l.id))).map((l) => ({ email: l.email, phone: l.phone, google_maps_url: l.google_maps_url }));
  }

  private researcherCap(): boolean {
    return grantOf(this.me(), "leads.edit").limit === "to_qualified";
  }

  private assertStageAllowed(stage: Stage) {
    if (this.researcherCap() && (FLOW_RANK[stage] ?? 99) > FLOW_RANK.qualified!) {
      throw new StoreError("You can take a lead up to Qualified. A manager assigns it to a BD from there.", "forbidden");
    }
  }

  private async writeNewLead(lead: Lead, note = ""): Promise<LeadView> {
    await this.put("lead", this.L.lead(lead.owner, lead.id), lead);
    await this.append("event", this.L.events(lead.owner), this.event(lead, { kind: "stage_change", from_stage: null, to_stage: lead.stage, note, occurred_on: lead.date_sourced }));
    return toView(lead);
  }

  private event(lead: Pick<Lead, "owner" | "id">, p: Partial<LeadEvent> & Pick<LeadEvent, "kind">): LeadEvent {
    return {
      id: randomUUID(), lead_owner: lead.owner, lead_id: lead.id, by: this.me().username, from_stage: null, to_stage: null, channel: null,
      occurred_on: todayIso(), note: "", created_at: nowIso(), ...p,
    };
  }

  private async checkNew(i: NewLeadInput, batch: DupCandidate[] = []): Promise<void> {
    if (i.stage) this.assertStageAllowed(i.stage);
    const dup = await this.findDuplicate(i);
    if (dup) throw new StoreError(this.dupMessage(i.business_name, dup), "duplicate");
    const keys = new Set(dupKeys(i));
    for (const b of batch) if (dupKeys(b).some((k) => keys.has(k))) throw new StoreError(`${i.business_name} appears twice in this batch.`, "duplicate");
  }

  private dupMessage(name: string, d: DupResult): string {
    return d.holder === this.me().username ? `${name} is already your lead.` : `${name} is already ${d.holderName}'s lead.`;
  }

  async createLead(input: NewLeadInput): Promise<LeadView> {
    return this.locked(async () => {
      const a = this.me();
      const g = this.need("leads.add");
      await this.checkNew(input);
      let kit_id = input.kit_id ?? null;
      if (kit_id && !(isId(kit_id) && (await this.load<KitRecord>("kit", this.L.kit(a.username, kit_id))))) kit_id = null;
      const lead = buildLead({ ...input, kit_id }, { id: randomUUID(), owner: a.username, assignedTo: g.scope === "queue" ? null : a.username, today: todayIso(), nowIso: nowIso() });
      return this.writeNewLead(lead);
    });
  }

  async importLeads(inputs: NewLeadInput[]): Promise<{ added: number }> {
    return this.locked(async () => {
      const a = this.me();
      const g = this.need("leads.add");
      const seen: DupCandidate[] = [];
      for (const i of inputs) {
        await this.checkNew(i, seen);
        seen.push(i);
      }
      for (const i of inputs) {
        const lead = buildLead(i, { id: randomUUID(), owner: a.username, assignedTo: g.scope === "queue" ? null : a.username, today: todayIso(), nowIso: nowIso() });
        await this.writeNewLead(lead);
      }
      return { added: inputs.length };
    });
  }

  async listLeads(opts?: { mine?: boolean }): Promise<LeadListItem[]> {
    const a = this.me();
    this.need("leads.view");
    const s = await this.snapshot();
    const owners = opts?.mine ? [a.username] : await this.owners("leads.view");
    return s.leads
      .filter((l) => owners.includes(l.owner))
      .map((l) => this.item(s, l))
      .filter((x) => opts?.mine || owners.length === 1 || !x.superseded);
  }

  async getLead(owner: string, id: string): Promise<LeadListItem | null> {
    this.need("leads.view");
    if (!isId(id) || usernameProblem(owner)) return null;
    if (!(await this.owners("leads.view")).includes(owner)) return null;
    const s = await this.snapshot();
    const l = s.leads.find((x) => x.owner === owner && x.id === id);
    return l ? this.item(s, l) : null;
  }

  private async ownLead(id: string): Promise<Lead> {
    const a = this.me();
    if (!isId(id)) throw new StoreError("That lead wasn't found.", "not_found");
    const l = await this.load<Lead>("lead", this.L.lead(a.username, id));
    if (!l || l.owner !== a.username) throw new StoreError("That lead wasn't found.", "not_found");
    return l;
  }

  async updateLead(id: string, input: NewLeadInput): Promise<LeadView> {
    return this.locked(async () => {
      this.need("leads.edit");
      const lead = await this.ownLead(id);
      const next = applyForm(lead, input, { withOutreach: !this.researcherCap(), nowIso: nowIso() });
      await this.put("lead", this.L.lead(next.owner, next.id), next);
      return toView(next);
    });
  }

  async moveStage(id: string, to: Stage, day: string): Promise<LeadView> {
    return this.locked(async () => {
      this.need("leads.edit");
      if (!STAGES.some((s) => s.value === to)) throw new StoreError("Choose a stage.");
      this.assertStageAllowed(to);
      const lead = await this.ownLead(id);
      const d = dayOr(day);
      const next: Lead = { ...lead, ...stageChangePatch(lead, to, d), updated_at: nowIso() };
      if (to === "contacted" && lead.stage !== "contacted" && !lead.channel) next.channel = "instagram_dm";
      await this.put("lead", this.L.lead(next.owner, next.id), next);
      if (to !== lead.stage) {
        await this.append("event", this.L.events(next.owner), this.event(next, { kind: "stage_change", from_stage: lead.stage, to_stage: to, occurred_on: d }));
        if (to === "contacted") {
          // The first message is the Day 0 touch.
          await this.append("event", this.L.events(next.owner), this.event(next, { kind: "touch", channel: lead.channel ?? "instagram_dm", occurred_on: d, note: SEQUENCE[0]!.title }));
        }
      }
      return toView(next);
    });
  }

  async logTouch(id: string, channel: Channel, day: string): Promise<LeadView> {
    return this.locked(async () => {
      this.need("leads.edit");
      if (this.researcherCap()) throw new StoreError("Researchers don't contact anyone.", "forbidden");
      const lead = await this.ownLead(id);
      if (!lead.first_contact_date) throw new StoreError("Move the lead to Contacted first.");
      if (lead.sequence_step >= SEQUENCE.length) throw new StoreError("Every step of the sequence is done.");
      const d = dayOr(day);
      const step = SEQUENCE[lead.sequence_step]!;
      const next: Lead = { ...lead, ...touchPatch(lead), updated_at: nowIso() };
      await this.append("event", this.L.events(next.owner), this.event(next, { kind: "touch", channel, occurred_on: d, note: step.title }));
      await this.put("lead", this.L.lead(next.owner, next.id), next);
      return toView(next);
    });
  }

  async deleteLead(id: string): Promise<void> {
    return this.locked(async () => {
      const a = this.me();
      this.need("leads.edit");
      const lead = await this.ownLead(id);
      this.guard(this.L.lead(a.username, lead.id));
      await rm(this.L.lead(a.username, lead.id), { force: true });
      invalidateStore(this.root);
    });
  }

  async addComment(owner: string, id: string, note: string, day: string): Promise<LeadEvent> {
    return this.locked(async () => {
      const a = this.me();
      this.need("leads.comment");
      const lead = await this.getLead(owner, id);
      if (!lead || !(await this.owners("leads.comment")).includes(owner)) throw new StoreError("That lead wasn't found.", "not_found");
      const text = note.trim();
      if (!text) throw new StoreError("Write a comment first.");
      const ev = this.event({ owner, id }, { kind: "comment", note: text.slice(0, 1000), occurred_on: dayOr(day) });
      await this.append("event", this.L.events(a.username), ev);
      return ev;
    });
  }

  async leadEvents(owner: string, id: string): Promise<LeadEvent[]> {
    this.need("leads.view");
    if (!(await this.getLead(owner, id))) return [];
    const s = await this.snapshot();
    const out: LeadEvent[] = [];
    for (const u of s.users) {
      for (const e of await readLines<LeadEvent>(this.L.events(u.username))) {
        if (e.lead_owner !== owner || e.lead_id !== id || !validateFile("event", e).ok) continue;
        if (u.username === owner || e.kind === "comment") out.push(e);
      }
    }
    return out.sort((x, y) => y.created_at.localeCompare(x.created_at) || y.id.localeCompare(x.id));
  }

  async readScope(key: PermissionKey): Promise<ScopeData> {
    this.need(key);
    const owners = await this.owners(key);
    const s = await this.snapshot();
    let leads = s.leads.filter((l) => owners.includes(l.owner)).map((l) => this.item(s, l)).filter((x) => owners.length === 1 || !x.superseded);
    const events: LeadEvent[] = [];
    for (const o of owners) for (const e of await readLines<LeadEvent>(this.L.events(o))) if (validateFile("event", e).ok) events.push(e);
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
    return this.locked(async () => {
      this.need("leads.export");
      const owners = await this.owners("leads.export");
      const s = await this.snapshot();
      const rows = s.leads
        .filter((l) => owners.includes(l.owner))
        .map((l) => this.item(s, l))
        .filter((x) => owners.length === 1 || !x.superseded)
        .sort((x, y) => x.date_sourced.localeCompare(y.date_sourced) || x.created_at.localeCompare(y.created_at));
      await this.audit("leads.export", "csv", `${rows.length} leads`);
      return rows;
    });
  }

  // ---------- hand-offs ----------
  async unassignedQueue(): Promise<LeadListItem[]> {
    this.need("leads.assign");
    const owners = await this.owners("leads.assign");
    const s = await this.snapshot();
    return s.leads
      .filter((l) => owners.includes(l.owner) && l.assignedTo === null && !l.sourceRef && !s.latestAssignment.has(leadKey(l.owner, l.id)))
      .map((l) => this.item(s, l))
      .sort((x, y) => y.created_at.localeCompare(x.created_at));
  }

  async assignLead(owner: string, id: string, to: string, kind?: "assign" | "handover"): Promise<Assignment> {
    return this.locked(async () => {
      const a = this.me();
      this.need("leads.assign");
      const owners = await this.owners("leads.assign");
      const s = await this.snapshot();
      const lead = s.leads.find((l) => l.owner === owner && l.id === id);
      if (!lead || !owners.includes(owner)) throw new StoreError("That lead wasn't found.", "not_found");
      if (s.supersededKeys.has(leadKey(owner, id))) throw new StoreError("That lead has already moved on. Use the copy its new owner holds.", "conflict");
      if (OPEN_EXCLUDED.includes(lead.stage)) throw new StoreError("That lead is closed. Only open leads are handed over.");
      const target = s.users.find((u) => u.username === to);
      if (!target || target.role !== "bd" || effectiveStatus(target, todayIso()) !== "active") throw new StoreError("Choose an active BD to take the lead.");
      if (scopeOf(a, "leads.assign") === "team" && target.team !== a.team) throw new StoreError("Choose a BD in your team.", "forbidden");
      if (target.username === lead.owner && lead.assignedTo === target.username) throw new StoreError("That BD already holds the lead.");
      const asg: Assignment = {
        id: randomUUID(), kind: kind ?? (lead.assignedTo === null ? "assign" : "handover"), by: a.username, leadOwner: owner, leadId: id,
        business: lead.business_name, to, at: nowIso(),
      };
      await this.append("assignment", this.L.assignments(a.username), asg);
      await this.audit(asg.kind === "assign" ? "lead.assign" : "lead.handover", `${owner}/${id}`, `to ${to}`);
      return asg;
    });
  }

  async incoming(): Promise<Incoming[]> {
    const a = this.me();
    this.need("leads.edit");
    const s = await this.snapshot();
    const out: Incoming[] = [];
    for (const asg of s.latestAssignment.values()) {
      if (asg.to !== a.username) continue;
      const lead = s.leads.find((l) => l.owner === asg.leadOwner && l.id === asg.leadId);
      if (!lead) continue;
      const accepted = s.leads.some((l) => l.owner === a.username && l.sourceRef?.owner === asg.leadOwner && l.sourceRef.id === asg.leadId);
      if (accepted || lead.owner === a.username) continue;
      out.push({ assignment: asg, lead: toView(lead), from: asg.leadOwner });
    }
    return out.sort((x, y) => y.assignment.at.localeCompare(x.assignment.at));
  }

  async acceptAssignment(assignmentId: string): Promise<LeadView> {
    return this.locked(async () => {
      const a = this.me();
      this.need("leads.edit");
      const pending = (await this.incoming()).find((i) => i.assignment.id === assignmentId);
      if (!pending) throw new StoreError("That hand-off isn't waiting for you any more.", "not_found");
      const src = pending.lead;
      const { score: _s, tier: _t, heldBy: _h, superseded: _x, pendingTo: _p, ...base } = src as LeadListItem;
      void _s; void _t; void _h; void _x; void _p;
      const copy: Lead = {
        ...(base as Lead), id: randomUUID(), owner: a.username, assignedTo: a.username, sourceRef: { owner: src.owner, id: src.id },
        kit_id: null, created_at: nowIso(), updated_at: nowIso(),
      };
      const from = await this.holderName(src.owner);
      const view = await this.writeNewLead(copy, `Accepted from ${from}`);
      await this.audit("lead.accept", `${src.owner}/${src.id}`, "");
      return view;
    });
  }

  async listAssignments(): Promise<Assignment[]> {
    this.need("leads.assign");
    return (await this.snapshot()).assignments;
  }

  // ---------- records ----------
  async listAudit(limit = 500): Promise<AuditEntry[]> {
    this.need("audit.view");
    const out: AuditEntry[] = [];
    for (const u of (await this.snapshot()).users) for (const e of await readLines<AuditEntry>(this.L.audit(u.username))) if (validateFile("audit", e).ok) out.push(e);
    return out.sort((x, y) => y.at.localeCompare(x.at) || y.id.localeCompare(x.id)).slice(0, limit);
  }

  async getPlaybook(): Promise<PlaybookFile> {
    const a = this.me();
    return (await this.load<PlaybookFile>("playbook", this.L.playbook(a.username))) ?? { reads: {}, required: [] };
  }
  async markRead(sectionId: string): Promise<void> {
    return this.locked(async () => {
      const a = this.me();
      this.need("playbook.read");
      const pb = await this.getPlaybook();
      if (pb.reads[sectionId]) return;
      await this.put("playbook", this.L.playbook(a.username), { ...pb, reads: { ...pb.reads, [sectionId]: nowIso() } });
    });
  }
  async setRequired(sectionIds: string[]): Promise<void> {
    return this.locked(async () => {
      const a = this.me();
      this.need("playbook.required");
      const pb = await this.getPlaybook();
      await this.put("playbook", this.L.playbook(a.username), { ...pb, required: [...new Set(sectionIds)].sort() });
      await this.audit("playbook.required", "playbook", sectionIds.join(","));
    });
  }
  async requiredFor(username: string): Promise<string[]> {
    this.me();
    const users = (await this.snapshot()).users;
    const target = users.find((u) => u.username === username);
    if (!target) return [];
    const out = new Set<string>();
    for (const u of users) {
      const scope = scopeOf(u.role, "playbook.required");
      if (scope === "none") continue;
      if (scope === "team" && !(u.team !== null && u.team === target.team)) continue;
      const pb = await this.load<PlaybookFile>("playbook", this.L.playbook(u.username));
      for (const s of pb?.required ?? []) out.add(s);
    }
    return [...out].sort();
  }
  async playbookProgress(): Promise<{ user: DirectoryEntry; reads: Record<string, string>; required: string[] }[]> {
    this.need("playbook.required");
    const owners = new Set(await this.owners("playbook.required"));
    const out = [];
    for (const user of (await this.directory()).filter((d) => owners.has(d.username) && d.status !== "disabled")) {
      const pb = await this.load<PlaybookFile>("playbook", this.L.playbook(user.username));
      out.push({ user, reads: pb?.reads ?? {}, required: await this.requiredFor(user.username) });
    }
    return out;
  }

  async listApprovals(): Promise<ApprovalRecord[]> {
    const a = this.me();
    this.need("content.approve");
    return (await this.load<ApprovalsFile>("approvals", this.L.approvals(a.username)))?.approvals ?? [];
  }
  async addApproval(rec: Omit<ApprovalRecord, "id" | "approvedAt">): Promise<ApprovalRecord> {
    return this.locked(async () => {
      const a = this.me();
      this.need("content.approve");
      const cur = await this.listApprovals();
      const full: ApprovalRecord = { ...rec, id: randomUUID(), approvedAt: nowIso() };
      await this.put("approvals", this.L.approvals(a.username), { approvals: [...cur, full] });
      await this.audit("content.approve", `${rec.kind}:${rec.fileId}`, `version ${rec.version}`);
      return full;
    });
  }

  // ---------- lead finder ----------
  finder(): FinderStore {
    const a = () => this.me();
    const row = (b: FinderBusiness & { movedLeadId: string | null; owner: string }): BusinessRow => {
      const { runId: _r, owner: _o, ...rest } = b;
      void _r; void _o;
      return rest;
    };
    return {
      countSavedOn: async (day) => {
        this.need("finder.run");
        return (await this.snapshot()).businesses.filter((b) => b.owner === a().username && b.scrapedOn === day).length;
      },
      existingPlaceKeys: async (keys) => {
        this.need("finder.run");
        const s = await this.snapshot();
        const idx = this.dupIndex(s);
        const known = new Set<string>();
        const wanted = new Set(keys);
        for (const b of s.businesses) if (wanted.has(b.placeKey)) known.add(b.placeKey);
        for (const k of keys) if (idx.find(["m:" + k])) known.add(k);
        return known;
      },
      insertBusiness: async (b: NewBusiness) => {
        return this.locked(async () => {
          this.need("finder.run");
          const s = await this.snapshot();
          const keys = finderKeys(b);
          if (this.dupIndex(s).find(keys)) return null;
          if (s.businesses.some((x) => finderKeys(x).some((k) => keys.includes(k)))) return null;
          const id = randomUUID();
          const line: FinderLine = {
            kind: "business", id, placeKey: b.placeKey, scrapedOn: b.scrapedOn, scrapedAt: nowIso(), runId: b.runId, query: b.query, category: b.category,
            city: b.city, state: b.state, name: b.name.slice(0, 255), phone: b.phone.slice(0, 60), address: b.address.slice(0, 500), mapsCategory: b.mapsCategory.slice(0, 200),
            rating: b.rating, reviewCount: b.reviewCount, email: b.email.slice(0, 255), facebookUrl: b.facebookUrl.slice(0, 500), instagramUrl: b.instagramUrl.slice(0, 500),
            otherLinks: b.otherLinks, mapsUrl: b.mapsUrl.slice(0, 1000),
          };
          await this.append("finderLine", this.L.finderBusinesses(a().username), line);
          return id;
        });
      },
      getBusiness: async (id) => {
        this.need("finder.run");
        const b = (await this.snapshot()).businesses.find((x) => x.owner === a().username && x.id === id);
        return b ? row(b) : null;
      },
      listBusinesses: async (where, limit = 500) => {
        this.need("finder.run");
        return (await this.snapshot()).businesses
          .filter((b) => b.owner === a().username && b.category === where.category && b.city === where.city && b.state === where.state)
          .sort((x, y) => y.scrapedAt.localeCompare(x.scrapedAt) || y.id.localeCompare(x.id))
          .slice(0, limit)
          .map(row);
      },
      markMoved: async (id, leadId) => {
        return this.locked(async () => {
          this.need("finder.run");
          const b = (await this.snapshot()).businesses.find((x) => x.owner === a().username && x.id === id);
          if (!b || b.movedLeadId) return false;
          await this.append("finderLine", this.L.finderBusinesses(a().username), { kind: "moved", id, leadId, at: nowIso() });
          return true;
        });
      },
      startRun: async (r) => {
        return this.locked(async () => {
          this.need("finder.run");
          const id = randomUUID();
          const line: FinderRunLine = { kind: "start", id, at: nowIso(), ...r };
          await this.append("finderRunLine", this.L.finderRuns(a().username), line);
          return id;
        });
      },
      finishRun: async (id, c, stopReason) => {
        return this.locked(async () => {
          this.need("finder.run");
          const line: FinderRunLine = { kind: "finish", id, at: nowIso(), ...c, stopReason: stopReason.slice(0, 500) };
          await this.append("finderRunLine", this.L.finderRuns(a().username), line);
        });
      },
    };
  }
}

export function createStore(actor: Actor | null, root: string = rootDir()): Store {
  return new FileStore(root, actor);
}

export { stableStringify, ID_RE };
export { placeKey };

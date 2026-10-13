// Reads a team/ folder for the migration into MySQL. It only reads: nothing under team/ is written, moved or deleted.
// Every file is checked against its schema; what can't be used is listed as a problem, with its path, never dropped quietly.
import path from "node:path";
import { listDir, readJson, readText } from "./json";
import { FormatTooNewError, migrateData } from "./migrate";
import { ID_RE, layout, usernameProblem } from "./paths";
import { validateFile, type SchemaName } from "./schemas";
import { SCHEMA_VERSION } from "./types";
import type {
  ApprovalRecord, ApprovalsFile, Assignment, AuditEntry, FinderBusiness, FinderLine, FinderRunLine, KitRecord, Lead, LeadEvent, PlaybookFile, Profile,
  TeamsFile, UserFile, Workspace,
} from "./types";

export const KINDS = [
  "workspace", "teams", "users", "profiles", "playbooks", "approvals", "kits", "leads", "events", "assignments", "audit", "finder runs", "finder businesses",
] as const;
export type Kind = (typeof KINDS)[number];

export interface Problem { kind: Kind | "folders"; where: string; message: string }

export interface FinderRun {
  id: string; owner: string; startedAt: string; query: string; category: string; city: string; state: string; limit: number;
  finishedAt: string | null; found: number | null; checked: number | null; skippedHasWebsite: number | null; skippedDuplicate: number | null; saved: number | null; stopReason: string | null;
}
export type SourceBusiness = FinderBusiness & { owner: string; movedLeadId: string | null; movedAt: string | null };

export interface TeamSource {
  root: string;
  version: number;
  workspace: Workspace | null;
  teams: TeamsFile | null;
  users: UserFile[];
  profiles: ({ username: string } & Profile)[];
  playbooks: ({ username: string } & PlaybookFile)[];
  approvals: (ApprovalRecord & { owner: string })[];
  kits: KitRecord[];
  leads: Lead[];
  /** In the order they were written: users A to Z, each file top to bottom. */
  events: LeadEvent[];
  assignments: Assignment[];
  audit: AuditEntry[];
  runs: FinderRun[];
  businesses: SourceBusiness[];
  /** Records found per kind (a JSON file counts once, a line of a .jsonl file counts once), valid or not. */
  found: Record<Kind, number>;
  problems: Problem[];
}

const validTime = (s: unknown) => typeof s === "string" && !Number.isNaN(Date.parse(s));
const rel = (root: string, file: string) => path.relative(root, file).split(path.sep).join("/");

export async function readTeamSource(root: string): Promise<TeamSource> {
  const L = layout(root);
  const found = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>;
  const problems: Problem[] = [];
  const bad = (kind: Kind | "folders", file: string, message: string) => problems.push({ kind, where: rel(root, file), message });

  const schema = await readJson<{ version?: number }>(L.schema);
  const version = typeof schema?.version === "number" ? schema.version : SCHEMA_VERSION;
  if (version > SCHEMA_VERSION) throw new FormatTooNewError(version, SCHEMA_VERSION);

  /** One JSON file, migrated forward and validated. Null (with a problem) when it can't be used. */
  async function one<T>(kind: Kind, schemaName: SchemaName, file: string): Promise<T | null> {
    const text = await readText(file);
    if (text === null) return null;
    found[kind]++;
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { bad(kind, file, "not valid JSON"); return null; }
    const data = migrateData(schemaName, raw, version);
    const v = validateFile(schemaName, data);
    if (!v.ok) { bad(kind, file, v.error); return null; }
    return data as T;
  }

  /** The lines of a .jsonl file: each parsed and validated; a torn or invalid line is a problem. */
  async function lines<T>(kind: Kind, schemaName: SchemaName, file: string): Promise<T[]> {
    const text = await readText(file);
    if (!text) return [];
    const out: T[] = [];
    for (const [i, line] of text.split(/\r?\n/).entries()) {
      if (!line.trim()) continue;
      found[kind]++;
      let raw: unknown;
      try { raw = JSON.parse(line); } catch { bad(kind, file, `line ${i + 1} is not valid JSON`); continue; }
      const v = validateFile(schemaName, raw);
      if (!v.ok) { bad(kind, file, `line ${i + 1}: ${v.error}`); continue; }
      out.push(raw as T);
    }
    return out;
  }

  const src: TeamSource = {
    root, version, workspace: null, teams: null, users: [], profiles: [], playbooks: [], approvals: [], kits: [], leads: [], events: [], assignments: [],
    audit: [], runs: [], businesses: [], found, problems,
  };

  src.workspace = await one<Workspace>("workspace", "workspace", L.workspace);
  src.teams = await one<TeamsFile>("teams", "teams", L.teams);

  for (const f of (await listDir(L.users)).sort()) {
    if (!f.endsWith(".json") || f.startsWith(".")) continue;
    const file = path.join(L.users, f);
    const u = await one<UserFile>("users", "user", file);
    if (!u) continue;
    if (`${u.username}.json` !== f || usernameProblem(u.username)) { bad("users", file, `the file name doesn't match the username "${u.username}"`); continue; }
    if (![u.createdAt, u.updatedAt].every(validTime)) { bad("users", file, "createdAt or updatedAt isn't a date"); continue; }
    src.users.push(u);
  }
  src.users.sort((a, b) => a.username.localeCompare(b.username));
  const known = new Set(src.users.map((u) => u.username));

  // A data folder without an account is not read by the app today; say so instead of importing it.
  for (const dir of (await listDir(path.join(L.team, "data"))).sort()) {
    if (known.has(dir)) continue;
    const n = (await listDir(path.join(L.team, "data", dir))).length;
    bad("folders", path.join(L.team, "data", dir), `has no account in team/users (${n} entr${n === 1 ? "y" : "ies"}); not imported`);
  }

  for (const u of src.users) {
    const name = u.username;
    const profile = await one<Profile>("profiles", "profile", L.profile(name));
    if (profile) src.profiles.push({ username: name, ...profile });
    const playbook = await one<PlaybookFile>("playbooks", "playbook", L.playbook(name));
    if (playbook) src.playbooks.push({ username: name, ...playbook });
    const approvals = await one<ApprovalsFile>("approvals", "approvals", L.approvals(name));
    if (approvals) found.approvals += approvals.approvals.length - 1; // the unit is one approval, not the file
    for (const a of approvals?.approvals ?? []) src.approvals.push({ ...a, owner: name });

    for (const f of (await listDir(L.kitsDir(name))).sort()) {
      if (!f.endsWith(".json") || f.startsWith(".")) continue;
      const file = path.join(L.kitsDir(name), f);
      const k = await one<KitRecord>("kits", "kit", file);
      if (!k) continue;
      if (k.owner !== name || `${k.id}.json` !== f || !ID_RE.test(k.id)) bad("kits", file, "its owner or id doesn't match where the file is");
      else if (![k.created_at, k.updated_at].every(validTime)) bad("kits", file, "created_at or updated_at isn't a date");
      else src.kits.push(k);
    }

    for (const f of (await listDir(L.leadsDir(name))).sort()) {
      if (!f.endsWith(".json") || f.startsWith(".")) continue;
      const file = path.join(L.leadsDir(name), f);
      const l = await one<Lead>("leads", "lead", file);
      if (!l) continue;
      if (l.owner !== name || `${l.id}.json` !== f || !ID_RE.test(l.id)) bad("leads", file, "its owner or id doesn't match where the file is");
      else if (![l.created_at, l.updated_at].every(validTime)) bad("leads", file, "created_at or updated_at isn't a date");
      else src.leads.push(l);
    }

    for (const e of await lines<LeadEvent>("events", "event", L.events(name))) {
      if (validTime(e.created_at) && ID_RE.test(e.id)) src.events.push(e);
      else bad("events", L.events(name), `event ${e.id} has a bad id or created_at`);
    }
    for (const a of await lines<Assignment>("assignments", "assignment", L.assignments(name))) {
      if (validTime(a.at) && ID_RE.test(a.id)) src.assignments.push(a);
      else bad("assignments", L.assignments(name), `assignment ${a.id} has a bad id or date`);
    }
    for (const a of await lines<AuditEntry>("audit", "audit", L.audit(name))) {
      if (validTime(a.at) && ID_RE.test(a.id)) src.audit.push(a);
      else bad("audit", L.audit(name), `audit line ${a.id} has a bad id or date`);
    }

    const runLines = await lines<FinderRunLine>("finder runs", "finderRunLine", L.finderRuns(name));
    const runs = new Map<string, FinderRun>();
    for (const r of runLines) {
      if (r.kind === "start") {
        runs.set(r.id, {
          id: r.id, owner: name, startedAt: r.at, query: r.query, category: r.category, city: r.city, state: r.state, limit: r.limit,
          finishedAt: null, found: null, checked: null, skippedHasWebsite: null, skippedDuplicate: null, saved: null, stopReason: null,
        });
      }
    }
    for (const r of runLines) {
      if (r.kind !== "finish") continue;
      const run = runs.get(r.id);
      if (!run) { bad("finder runs", L.finderRuns(name), `a finish line for run ${r.id} has no start line`); continue; }
      Object.assign(run, { finishedAt: r.at, found: r.found, checked: r.checked, skippedHasWebsite: r.skippedHasWebsite, skippedDuplicate: r.skippedDuplicate, saved: r.saved, stopReason: r.stopReason });
    }
    found["finder runs"] -= runLines.filter((r) => r.kind === "finish").length; // a run is its start line; the finish line completes it
    src.runs.push(...runs.values());

    const bLines = await lines<FinderLine>("finder businesses", "finderLine", L.finderBusinesses(name));
    const moved = new Map<string, { leadId: string; at: string }>();
    for (const b of bLines) if (b.kind === "moved") moved.set(b.id, { leadId: b.leadId, at: b.at });
    found["finder businesses"] -= bLines.filter((b) => b.kind === "moved").length; // a "moved" line marks a business, it isn't one
    for (const b of bLines) {
      if (b.kind !== "business") continue;
      const { kind: _k, ...rest } = b;
      void _k;
      if (!validTime(rest.scrapedAt) || !ID_RE.test(rest.id)) { bad("finder businesses", L.finderBusinesses(name), `business ${rest.id} has a bad id or scrapedAt`); continue; }
      src.businesses.push({ ...rest, owner: name, movedLeadId: moved.get(rest.id)?.leadId ?? null, movedAt: moved.get(rest.id)?.at ?? null });
    }
  }
  return src;
}

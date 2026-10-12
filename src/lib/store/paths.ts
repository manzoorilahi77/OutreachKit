// The team/ folder layout. Every path the Store touches is built here with path.join, so Mac and Windows agree.
import path from "node:path";

/** The repo root. OKIT_ROOT lets tests and the two-laptop e2e point the app at a clone. */
export const rootDir = (): string => (process.env.OKIT_ROOT ? path.resolve(process.env.OKIT_ROOT) : process.cwd());

export const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
/** Windows refuses folder names that end in a dot or match a device name, and usernames are folder names. */
const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/;

export function usernameProblem(u: string): string | null {
  if (!USERNAME_RE.test(u)) return "Usernames are 3 to 30 characters: lower-case letters, digits, dot and underscore.";
  if (/^\.|\.$/.test(u) || u.includes("..")) return "A username can't start or end with a dot, or hold two dots in a row.";
  if (WINDOWS_DEVICE.test(u)) return "That username is reserved on Windows. Choose another.";
  return null;
}

export const isUsername = (u: unknown): u is string => typeof u === "string" && usernameProblem(u) === null;
export const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);

export interface Layout {
  root: string;
  team: string;
  local: string;
  schema: string;
  workspace: string;
  teams: string;
  users: string;
  userFile(username: string): string;
  data(username: string): string;
  profile(username: string): string;
  kitsDir(username: string): string;
  kit(username: string, id: string): string;
  leadsDir(username: string): string;
  lead(username: string, id: string): string;
  events(username: string): string;
  assignments(username: string): string;
  audit(username: string): string;
  playbook(username: string): string;
  approvals(username: string): string;
  finderBusinesses(username: string): string;
  finderRuns(username: string): string;
}

function checked(u: string): string {
  if (!isUsername(u)) throw new Error("Not a valid username.");
  return u;
}
function checkedId(id: string): string {
  if (!isId(id)) throw new Error("Not a valid id.");
  return id;
}

export function layout(root: string): Layout {
  const team = path.join(root, "team");
  const data = (u: string) => path.join(team, "data", checked(u));
  return {
    root,
    team,
    local: path.join(root, ".local"),
    schema: path.join(team, "schema.json"),
    workspace: path.join(team, "workspace.json"),
    teams: path.join(team, "teams.json"),
    users: path.join(team, "users"),
    userFile: (u) => path.join(team, "users", `${checked(u)}.json`),
    data,
    profile: (u) => path.join(data(u), "profile.json"),
    kitsDir: (u) => path.join(data(u), "kits"),
    kit: (u, id) => path.join(data(u), "kits", `${checkedId(id)}.json`),
    leadsDir: (u) => path.join(data(u), "leads"),
    lead: (u, id) => path.join(data(u), "leads", `${checkedId(id)}.json`),
    events: (u) => path.join(data(u), "events.jsonl"),
    assignments: (u) => path.join(data(u), "assignments.jsonl"),
    audit: (u) => path.join(data(u), "audit.jsonl"),
    playbook: (u) => path.join(data(u), "playbook.json"),
    approvals: (u) => path.join(data(u), "approvals.json"),
    finderBusinesses: (u) => path.join(data(u), "finder", "businesses.jsonl"),
    finderRuns: (u) => path.join(data(u), "finder", "runs.jsonl"),
  };
}

/** Is `file` inside `dir` (or equal to it)? Used by the write guard. */
export function isInside(dir: string, file: string): boolean {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

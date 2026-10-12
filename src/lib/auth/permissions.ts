// The "Who can do what" matrix of docs/source/roles-system.html as code. One row per matrix row.
// Each cell is a scope, not a yes/no:
//   all    everything in the workspace          below  roles below admin
//   team   their team                           own    their own
//   queue  into the unassigned queue            none   no access
// A few cells carry a limit the page spells out ("All read", "All totals", "Own to Qualified",
// "Own + accounts", "All except the Super Admin's"). The limit never widens the scope; callers read it with `limitOf()`.
// With files on every laptop this decides what the app shows and allows, not what is on disk.
import { ROLES, type Role } from "./roles";

export type Scope = "all" | "below" | "team" | "own" | "queue" | "none";
export type Limit = "read" | "totals" | "to_qualified" | "accounts" | "not_super_admin";

export const SCOPES: readonly Scope[] = ["all", "below", "team", "own", "queue", "none"];

type Cell = Scope | readonly [Scope, Limit];
type Row = readonly [Cell, Cell, Cell, Cell, Cell, Cell]; // super_admin, admin, manager, bd, researcher, viewer

const NONE = "none" as const;

export const PERMISSION_GROUPS = ["People and workspace", "Kits (territories are shared)", "Leads", "Reviews, playbook and records"] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

interface Def {
  group: PermissionGroup;
  label: string;
  row: Row;
}

const [PEOPLE, KITS, LEADS, REVIEWS] = PERMISSION_GROUPS;

const DEFS = {
  "users.create": { group: PEOPLE, label: "Create accounts, share the login", row: ["all", "below", NONE, NONE, NONE, NONE] },
  "users.reset_password": { group: PEOPLE, label: "Reset a password", row: ["all", "below", NONE, NONE, NONE, NONE] },
  "users.set_status": { group: PEOPLE, label: "Suspend, disable, enable", row: ["all", "below", NONE, NONE, NONE, NONE] },
  "users.change_role": { group: PEOPLE, label: "Change role, move team", row: ["all", "below", NONE, NONE, NONE, NONE] },
  "account.change_password": { group: PEOPLE, label: "Change own password", row: ["own", "own", "own", "own", "own", "own"] },
  "workspace.manage": { group: PEOPLE, label: "Teams and company details used in every kit", row: ["all", "all", NONE, NONE, NONE, NONE] },

  "kits.build": { group: KITS, label: "Build a kit in the console", row: ["all", "all", "all", "all", "all", NONE] },
  "kits.save": { group: KITS, label: "Save a kit", row: ["own", "own", "own", "own", NONE, NONE] },
  "kits.view": { group: KITS, label: "See saved kits", row: ["all", "all", "team", "own", NONE, ["all", "read"]] },
  "kits.territory": { group: KITS, label: "See who else works a category and city", row: ["all", "all", "all", "all", "all", NONE] },

  "leads.add": { group: LEADS, label: "Add a lead (duplicates blocked for everyone)", row: ["own", "own", "own", "own", "queue", NONE] },
  "leads.view": { group: LEADS, label: "See leads with contact details", row: ["all", ["all", "not_super_admin"], "team", "own", "own", NONE] },
  "leads.edit": { group: LEADS, label: "Edit, score, move stage", row: ["own", "own", "own", "own", ["own", "to_qualified"], NONE] },
  "leads.assign": { group: LEADS, label: "Assign researcher leads to a BD", row: ["all", ["all", "not_super_admin"], "team", NONE, NONE, NONE] },
  "leads.handover": { group: LEADS, label: "Hand over a BD's leads", row: ["all", ["all", "not_super_admin"], "team", NONE, NONE, NONE] },
  "leads.comment": { group: LEADS, label: "Comment on a lead", row: ["all", ["all", "not_super_admin"], "team", "own", NONE, NONE] },
  "leads.export": { group: LEADS, label: "Export CSV", row: ["all", ["all", "not_super_admin"], "team", "own", NONE, NONE] },
  "finder.run": { group: LEADS, label: "Run the lead finder", row: ["own", "own", "own", "own", "own", NONE] },

  "reports.view": { group: REVIEWS, label: "Ratios and reports", row: ["all", ["all", "not_super_admin"], "team", "own", "own", ["all", "totals"]] },
  "review.weekly": { group: REVIEWS, label: "Weekly review", row: ["all", ["all", "not_super_admin"], "team", "own", NONE, NONE] },
  "playbook.read": { group: REVIEWS, label: "Read the playbook", row: ["all", "all", "all", "all", "all", "all"] },
  "playbook.required": { group: REVIEWS, label: "Mark sections required, see who read them", row: ["all", "all", "team", NONE, NONE, NONE] },
  "content.approve": { group: REVIEWS, label: "Approve category kits and segments", row: ["all", NONE, NONE, NONE, NONE, NONE] },
  "audit.view": { group: REVIEWS, label: "Audit log", row: ["all", "all", NONE, NONE, NONE, NONE] },
  "sync.run": { group: REVIEWS, label: "Sync with GitHub", row: [["own", "accounts"], ["own", "accounts"], "own", "own", "own", "own"] },
} as const satisfies Record<string, Def>;

export type PermissionKey = keyof typeof DEFS;

export const PERMISSION_KEYS = Object.keys(DEFS) as PermissionKey[];

export interface PermissionInfo {
  key: PermissionKey;
  group: PermissionGroup;
  label: string;
}

export const PERMISSIONS: readonly PermissionInfo[] = PERMISSION_KEYS.map((key) => ({ key, group: DEFS[key].group, label: DEFS[key].label }));

export interface Grant {
  scope: Scope;
  limit?: Limit;
}

/** Anything that carries a role: a bare role holder, or a session with `user.role`. */
export type Subject = { role: Role } | { user: { role: Role } };

const roleOf = (s: Subject): Role => ("user" in s ? s.user.role : s.role);

export function grantOf(subject: Subject | Role, key: PermissionKey): Grant {
  const role = typeof subject === "string" ? subject : roleOf(subject);
  const cell: Cell = (DEFS[key].row as Row)[ROLES.indexOf(role)] ?? NONE;
  if (typeof cell === "string") return { scope: cell };
  return { scope: cell[0], limit: cell[1] };
}

export const scopeOf = (subject: Subject | Role, key: PermissionKey): Scope => grantOf(subject, key).scope;
export const limitOf = (subject: Subject | Role, key: PermissionKey): Limit | undefined => grantOf(subject, key).limit;

/** True for any scope except `none`. Components ask this, never for a role name. */
export const can = (subject: Subject | Role, key: PermissionKey): boolean => scopeOf(subject, key) !== "none";

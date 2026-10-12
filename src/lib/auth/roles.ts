// The six roles of the Outreach Kit Role System (docs/source/roles-system.html). Exactly these six.
// Components never compare against these names: they ask `can(session, key)` from permissions.ts.

export const ROLES = ["super_admin", "admin", "manager", "bd", "researcher", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  bd: "BD Executive",
  researcher: "Lead Researcher",
  viewer: "Viewer",
};

/** Where each role lands after sign-in. */
export const ROLE_HOMES: Record<Role, string> = {
  super_admin: "/platform",
  admin: "/admin",
  manager: "/team",
  bd: "/today",
  researcher: "/sourcing",
  viewer: "/reports",
};

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

/** The roles an admin may act on. The super admin is never created from the app. */
const BELOW_ADMIN: readonly Role[] = ["manager", "bd", "researcher", "viewer"];

/**
 * Who can act on whom (create, reset password, suspend, disable, enable, change role, move team).
 * Super admin: every role below super admin. Admin: manager, bd, researcher, viewer.
 * Nobody acts on themselves (only their own password, a separate permission), on another admin,
 * or on the super admin. Everyone else acts on nobody.
 * Callers also check the actor is not the target: the role pair alone can't tell two admins apart.
 */
export function canManage(actor: Role, target: Role): boolean {
  if (actor === "super_admin") return target !== "super_admin";
  if (actor === "admin") return BELOW_ADMIN.includes(target);
  return false;
}

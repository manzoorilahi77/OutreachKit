// Navigation per role, exactly as the Role System page lists it. Items are filtered again by permission, so a link never
// shows for something the person can't open.
import type { PermissionKey } from "./permissions";
import { can } from "./permissions";
import type { Role } from "./roles";

export interface NavItem { label: string; href: string; perm: PermissionKey | null }

const I = (label: string, href: string, perm: PermissionKey | null = null): NavItem => ({ label, href, perm });

const KIT_CONSOLE = I("Kit Console", "/console", "kits.build");
const PLAYBOOK = I("Playbook", "/playbook", "playbook.read");

const ADMIN_NAV: NavItem[] = [
  I("Overview", "/admin", "workspace.manage"), I("Kits", "/kits", "kits.view"), I("Leads", "/leads", "leads.view"),
  I("Unassigned queue", "/queue", "leads.assign"), I("Users", "/admin/users", "users.create"), I("Teams", "/admin/teams", "workspace.manage"),
  I("Reports", "/reports", "reports.view"), PLAYBOOK, I("Settings", "/admin/settings", "workspace.manage"), I("Audit", "/admin/audit", "audit.view"),
];

export const NAV: Record<Role, NavItem[]> = {
  super_admin: [
    I("Platform", "/platform", "content.approve"), I("Users", "/platform/users", "content.approve"), I("Workspace details", "/platform/workspace", "content.approve"),
    I("Content review", "/platform/content", "content.approve"), I("Feature switches", "/platform/features", "content.approve"), I("Audit", "/platform/audit", "content.approve"),
    // Everything an Admin sees (Users, Settings and Audit are above).
    I("Overview", "/admin", "workspace.manage"), I("Kits", "/kits", "kits.view"), I("Leads", "/leads", "leads.view"),
    I("Unassigned queue", "/queue", "leads.assign"), I("Teams", "/admin/teams", "workspace.manage"), I("Reports", "/reports", "reports.view"), PLAYBOOK,
  ],
  admin: ADMIN_NAV,
  manager: [
    I("Team today", "/team", "leads.assign"), KIT_CONSOLE, I("Team kits", "/kits", "kits.view"), I("Team leads", "/leads", "leads.view"),
    I("Unassigned queue", "/queue", "leads.assign"), I("Weekly review", "/review", "review.weekly"), I("Playbook progress", "/playbook/progress", "playbook.required"), PLAYBOOK,
  ],
  bd: [
    I("Today", "/today", "kits.save"), KIT_CONSOLE, I("My kits", "/kits", "kits.view"), I("My leads", "/leads", "leads.view"),
    I("Weekly review", "/review", "review.weekly"), PLAYBOOK, I("My password", "/account/password"),
  ],
  researcher: [
    I("Sourcing", "/sourcing", "finder.run"), I("Lead finder", "/sourcing/finder", "finder.run"), I("Kit Console (build only)", "/console", "kits.build"),
    I("My sourced leads", "/leads", "leads.view"), PLAYBOOK, I("My password", "/account/password"),
  ],
  viewer: [I("Reports", "/reports", "reports.view"), PLAYBOOK, I("My password", "/account/password")],
};

export function navFor(role: Role): NavItem[] {
  return NAV[role].filter((i) => i.perm === null || can(role, i.perm));
}

/** IT Prospects, a separate area: one entry, placed right after Kits, and only while the workspace's IT Prospects switch is on. */
export const IT_NAV_ITEM: NavItem = I("IT Prospects", "/it", "it.view");

export function withItNav(items: NavItem[], role: Role, itOn: boolean): NavItem[] {
  if (!itOn || !can(role, "it.view")) return items;
  const kitsAt = items.findIndex((i) => i.href === "/kits");
  if (kitsAt >= 0) return [...items.slice(0, kitsAt + 1), IT_NAV_ITEM, ...items.slice(kitsAt + 1)];
  const at = items.findIndex((i) => i.href === "/playbook");
  return at < 0 ? [...items, IT_NAV_ITEM] : [...items.slice(0, at), IT_NAV_ITEM, ...items.slice(at)];
}

/** The item whose href is the longest prefix of the current path is the current page. */
export function activeHref(items: { href: string }[], pathname: string): string | null {
  let best: string | null = null;
  for (const i of items) {
    const h = i.href.split("#")[0]!;
    if ((pathname === h || pathname.startsWith(h + "/")) && (!best || h.length > best.length)) best = h;
  }
  return best;
}

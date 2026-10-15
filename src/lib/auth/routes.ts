// The route map: which permission each path needs. Longest matching prefix wins. The middleware and every page agree on it.
import type { PermissionKey } from "./permissions";

export type RouteRule = PermissionKey | "public" | "session";

const RULES: [prefix: string, rule: RouteRule][] = [
  ["/login", "public"],
  ["/no-access", "session"],
  ["/account", "session"],
  ["/styleguide", "session"],
  ["/forbidden", "session"],
  ["/console", "kits.build"],
  ["/today", "kits.save"],
  ["/team", "leads.assign"],
  ["/queue", "leads.assign"],
  ["/handover", "leads.handover"],
  ["/admin/users", "users.create"],
  ["/admin/teams", "workspace.manage"],
  ["/admin/settings", "workspace.manage"],
  ["/admin/audit", "audit.view"],
  ["/admin", "workspace.manage"],
  ["/platform", "content.approve"],
  ["/sourcing", "finder.run"],
  ["/reports", "reports.view"],
  ["/review", "review.weekly"],
  ["/kits", "kits.view"],
  ["/leads/new", "leads.add"],
  ["/leads/import", "leads.add"],
  ["/leads/export.csv", "leads.export"],
  ["/leads", "leads.view"],
  ["/playbook/progress", "playbook.required"],
  ["/playbook", "playbook.read"],
  ["/api/leadfinder", "finder.run"],
  ["/it", "it.view"],
  ["/it/finder", "it.finder"],
  ["/it/signals", "it.add"],
  ["/it/prospects/new", "it.add"],
  ["/it/export.csv", "it.export"],
  ["/api/it/finder", "it.finder"],
];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

/** `/` is a redirect by role, open to any session. Unknown paths need a session. */
export function ruleFor(pathname: string): RouteRule {
  if (pathname === "/") return "session";
  let best: [string, RouteRule] | null = null;
  for (const r of RULES) if (under(pathname, r[0]) && (!best || r[0].length > best[0].length)) best = r;
  return best ? best[1] : "session";
}

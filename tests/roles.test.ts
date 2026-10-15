import { describe, expect, it } from "vitest";
import { ROLES, ROLE_HOMES, canManage, isRole, type Role } from "@/lib/auth/roles";
import { PERMISSION_KEYS, SCOPES, can, limitOf, scopeOf, type PermissionKey, type Scope } from "@/lib/auth/permissions";

// The matrix of docs/source/roles-system.html, typed out independently of permissions.ts.
// Columns: super_admin, admin, manager, bd, researcher, viewer. "all:read" is a scope with a limit.
const MATRIX: Record<PermissionKey, string[]> = {
  "users.create": ["all", "below", "none", "none", "none", "none"],
  "users.reset_password": ["all", "below", "none", "none", "none", "none"],
  "users.set_status": ["all", "below", "none", "none", "none", "none"],
  "users.change_role": ["all", "below", "none", "none", "none", "none"],
  "account.change_password": ["own", "own", "own", "own", "own", "own"],
  "workspace.manage": ["all", "all", "none", "none", "none", "none"],
  "kits.build": ["all", "all", "all", "all", "all", "none"],
  "kits.save": ["own", "own", "own", "own", "none", "none"],
  "kits.view": ["all", "all", "team", "own", "none", "all:read"],
  "kits.territory": ["all", "all", "all", "all", "all", "none"],
  "leads.add": ["own", "own", "own", "own", "queue", "none"],
  "leads.view": ["all", "all:not_super_admin", "team", "own", "own", "none"],
  "leads.edit": ["own", "own", "own", "own", "own:to_qualified", "none"],
  "leads.assign": ["all", "all:not_super_admin", "team", "none", "none", "none"],
  "leads.handover": ["all", "all:not_super_admin", "team", "none", "none", "none"],
  "leads.comment": ["all", "all:not_super_admin", "team", "own", "none", "none"],
  "leads.export": ["all", "all:not_super_admin", "team", "own", "none", "none"],
  "finder.run": ["own", "own", "own", "own", "own", "none"],
  "reports.view": ["all", "all:not_super_admin", "team", "own", "own", "all:totals"],
  "review.weekly": ["all", "all:not_super_admin", "team", "own", "none", "none"],
  "playbook.read": ["all", "all", "all", "all", "all", "all"],
  "playbook.required": ["all", "all", "team", "none", "none", "none"],
  "content.approve": ["all", "none", "none", "none", "none", "none"],
  "audit.view": ["all", "all", "none", "none", "none", "none"],
  "sync.run": ["own:accounts", "own:accounts", "own", "own", "own", "own"],
  "it.view": ["all", "all:not_super_admin", "team", "own", "own", "none"],
  "it.add": ["own", "own", "own", "own", "own", "none"],
  "it.edit": ["own", "own", "own", "own", "own", "none"],
  "it.assign": ["all", "all:not_super_admin", "team", "none", "none", "none"],
  "it.comment": ["all", "all:not_super_admin", "team", "own", "own", "none"],
  "it.export": ["all", "all:not_super_admin", "team", "own", "none", "none"],
  "it.finder": ["own", "own", "own", "own", "own", "none"],
};

describe("permission matrix", () => {
  it("has six roles", () => expect(ROLES).toEqual(["super_admin", "admin", "manager", "bd", "researcher", "viewer"]));
  it("covers exactly the keys of the matrix", () => expect([...PERMISSION_KEYS].sort()).toEqual(Object.keys(MATRIX).sort()));
  it("uses only the six scopes", () => expect(SCOPES).toEqual(["all", "below", "team", "own", "queue", "none"]));

  for (const [key, cells] of Object.entries(MATRIX) as [PermissionKey, string[]][]) {
    describe(key, () => {
      it.each(ROLES.map((r, i) => [r, cells[i]!] as const))("%s → %s", (role, expected) => {
        const [scope, limit] = expected.split(":");
        expect(scopeOf(role, key)).toBe(scope as Scope);
        expect(limitOf(role, key)).toBe(limit);
        expect(can(role, key)).toBe(scope !== "none");
      });
    });
  }

  it("accepts a role holder or a session shape", () => {
    expect(can({ role: "bd" }, "kits.save")).toBe(true);
    expect(can({ user: { role: "viewer" } }, "kits.save")).toBe(false);
    expect(scopeOf({ user: { role: "manager" } }, "leads.view")).toBe("team");
  });
});

describe("roles", () => {
  it("knows its roles", () => {
    expect(isRole("bd")).toBe(true);
    expect(isRole("owner")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
  it("gives each role the home from the source page", () => {
    expect(ROLE_HOMES).toEqual({ super_admin: "/platform", admin: "/admin", manager: "/team", bd: "/today", researcher: "/sourcing", viewer: "/reports" });
  });

  const BELOW_ADMIN: Role[] = ["manager", "bd", "researcher", "viewer"];
  const pairs = ROLES.flatMap((a) => ROLES.map((t) => [a, t] as const));
  it("has 36 pairs", () => expect(pairs).toHaveLength(36));
  it.each(pairs)("canManage(%s, %s)", (actor, target) => {
    const expected = actor === "super_admin" ? target !== "super_admin" : actor === "admin" ? BELOW_ADMIN.includes(target) : false;
    expect(canManage(actor, target)).toBe(expected);
  });

  it("agrees with the users.* scopes: a role can manage only if it holds them", () => {
    for (const r of ROLES) {
      const manages = ROLES.some((t) => canManage(r, t));
      expect(can(r, "users.create")).toBe(manages);
    }
  });
});

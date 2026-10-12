import { describe, expect, it } from "vitest";
import { countByStage, noticesFrom } from "@/lib/notices";
import { activeHref, navFor, NAV } from "@/lib/auth/nav";
import { ROLES } from "@/lib/auth/roles";
import { can } from "@/lib/auth/permissions";
import type { LeadEvent } from "@/lib/store/types";

const ev = (over: Partial<LeadEvent>): LeadEvent => ({
  id: "e", lead_owner: "ravi", lead_id: "l1", by: "ravi", kind: "stage_change", from_stage: "sourced", to_stage: "replied", channel: null,
  occurred_on: "2026-10-12", note: "", created_at: "2026-10-12T10:00:00.000Z", ...over,
});
const leads = [{ id: "l1", owner: "ravi", business_name: "Smith Roofing", stage: "replied" as const }];
const now = Date.parse("2026-10-14T00:00:00Z");

describe("notices", () => {
  it("fires for Replied, Call booked, Proposal sent and Won within 14 days", () => {
    const n = noticesFrom([ev({}), ev({ id: "b", to_stage: "call_booked" }), ev({ id: "c", to_stage: "proposal_sent" }), ev({ id: "d", to_stage: "won" })], leads, now);
    expect(n.map((x) => x.stage).sort()).toEqual(["call_booked", "proposal_sent", "replied", "won"]);
  });
  it("ignores other stages, comments, old events and deleted leads", () => {
    expect(noticesFrom([ev({ to_stage: "contacted" }), ev({ kind: "comment" }), ev({ created_at: "2026-09-01T00:00:00Z" }), ev({ lead_id: "gone" })], leads, now)).toEqual([]);
  });
  it("counts leads by stage", () => {
    expect(countByStage([{ stage: "won" }, { stage: "won" }, { stage: "lost" }]).get("won")).toBe(2);
  });
});

describe("navigation", () => {
  it("lists, per role, only what the role can open", () => {
    for (const r of ROLES) for (const i of navFor(r)) if (i.perm) expect(can(r, i.perm)).toBe(true);
  });
  it("follows the Role System page", () => {
    expect(NAV.viewer.map((i) => i.label)).toEqual(["Reports", "Playbook", "My password"]);
    expect(NAV.bd.map((i) => i.label)).toEqual(["Today", "Kit Console", "My kits", "My leads", "Weekly review", "Playbook", "My password"]);
    expect(NAV.researcher.map((i) => i.label)).toEqual(["Sourcing", "Lead finder", "Kit Console (build only)", "My sourced leads", "Playbook", "My password"]);
    expect(NAV.manager.map((i) => i.label)).toEqual(["Team today", "Kit Console", "Team kits", "Team leads", "Unassigned queue", "Weekly review", "Playbook progress", "Playbook"]);
    expect(NAV.admin.map((i) => i.label)).toEqual(["Overview", "Kits", "Leads", "Unassigned queue", "Users", "Teams", "Reports", "Playbook", "Settings", "Audit"]);
    expect(NAV.super_admin.slice(0, 6).map((i) => i.label)).toEqual(["Platform", "Users", "Workspace details", "Content review", "Feature switches", "Audit"]);
  });
  it("highlights the longest matching item", () => {
    expect(activeHref([{ href: "/admin" }, { href: "/admin/users" }], "/admin/users")).toBe("/admin/users");
    expect(activeHref([{ href: "/admin" }, { href: "/admin/users" }], "/admin")).toBe("/admin");
    expect(activeHref([{ href: "/kits" }], "/kits/abc")).toBe("/kits");
    expect(activeHref([{ href: "/kits" }], "/leads")).toBeNull();
  });
});

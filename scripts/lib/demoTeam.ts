// A believable team for screenshots and the accessibility pass: accounts for every role with their own passwords set,
// kits, leads at every stage, a queue, a pending hand-off, replies and a playbook read. Written into a MySQL database.
import { hashPassword } from "../../src/lib/auth/password";
import { todayIso } from "../../src/lib/clock";
import type { Pool } from "mysql2/promise";
import { createMySqlStore } from "../../src/lib/store/mysqlStore";
import { initWorkspaceDb } from "../../src/lib/store/mysqlBootstrap";
import type { Role } from "../../src/lib/auth/roles";
import type { Store } from "../../src/lib/store/store";
import type { Actor } from "../../src/lib/store/types";

export const DEMO_PASSWORD = (username: string) => `demo-password-${username}`;

export const PEOPLE: { username: string; fullName: string; role: Role; team: string | null }[] = [
  { username: "ada", fullName: "Ada Admin", role: "admin", team: null },
  { username: "mia", fullName: "Mia Manager", role: "manager", team: "team-a" },
  { username: "ravi", fullName: "Ravi Rao", role: "bd", team: "team-a" },
  { username: "asha", fullName: "Asha Aziz", role: "bd", team: "team-a" },
  { username: "meera", fullName: "Meera Menon", role: "researcher", team: "team-a" },
  { username: "ben", fullName: "Ben Brooks", role: "manager", team: "team-b" },
  { username: "bryn", fullName: "Bryn Burns", role: "bd", team: "team-b" },
  { username: "vic", fullName: "Vic Viewer", role: "viewer", team: null },
];

const CHECKS = ["check_no_real_website", "check_owner_run", "check_active_30_days", "check_older_3_months", "check_in_radius", "check_job_value_fits", "check_reviews_5_to_200", "check_reachable", "check_demand_signal", "check_second_channel"];
const ticks = (n: number) => Object.fromEntries(CHECKS.slice(0, n).map((c) => [c, true]));
const lead = (name: string, phone: string, over: Record<string, unknown> = {}) => ({
  business_name: name, owner_first_name: "", category: "Roofing", city: "Dallas", state: "TX", phone, email: "", instagram_handle: "", facebook_page: "",
  google_maps_url: "", website_found: null, website_url: "", site_verdict: "", google_review_count: null, google_rating: null, followers: null, last_post_date: null,
  demo_url: "", demo_built_date: null, first_contact_date: null, channel: null, notes: "", checks: ticks(7), ...over,
});

export async function seedDemoTeam(pool: Pool, ownerPassword = DEMO_PASSWORD("owner")): Promise<void> {
  const createStore = (a: Actor | null) => createMySqlStore(a, pool);
  const cost = (pw: string) => hashPassword(pw);
  await initWorkspaceDb(pool, {
    workspaceName: "Famysys", studio: "Famysys", demoDomain: "famysys.com", basedLine: "Based in Austin, TX", username: "owner", fullName: "Olive Owner",
    passwordHash: await cost(ownerPassword), unusableTempHash: await cost("nobody-knows-this"),
  });
  const ownerActor: Actor = { username: "owner", role: "super_admin", team: null };
  const owner = createStore(ownerActor);
  await owner.saveTeams({ teams: [{ id: "team-a", name: "Team A", managers: [] }, { id: "team-b", name: "Team B", managers: [] }] });
  const stores = new Map<string, Store>();
  for (const p of PEOPLE) {
    const u = await owner.createUser({ ...p, tempPasswordHash: await cost(`temp-${p.username}`) });
    const s = createStore({ username: p.username, role: p.role, team: p.team });
    await s.setOwnPassword(await cost(DEMO_PASSWORD(p.username)), u.pwRev);
    stores.set(p.username, s);
  }
  const today = todayIso();
  const addDays = (n: number) => new Date(Date.parse(today + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
  const ravi = stores.get("ravi")!, asha = stores.get("asha")!, meera = stores.get("meera")!, mia = stores.get("mia")!;

  const k1 = await ravi.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" });
  await ravi.createKit({ category: "Fencing & gates", device: "desktop", state: "TX", city: "Austin", cityIsFree: false, direction: "b" });
  const k3 = await ravi.createKit({ category: "Med spas", device: "mobile", state: "FL", city: "Tampa", cityIsFree: false, direction: "b" });
  await ravi.updateKit(k3.id, { status: "draft" });
  await asha.createKit({ category: "Roofing", device: "desktop", state: "TX", city: "Dallas", cityIsFree: false, direction: "b" });

  const names = ["Smith Roofing", "Lone Star Roof Pros", "Alamo Shingle Co", "Bluebonnet Roofing", "Cedar Ridge Roofers", "Dallas Peak Roofing", "Eagle Eye Roof Repair", "Frisco Flat Roof"];
  const stagePlan = ["sourced", "qualified", "demo_built", "contacted", "contacted", "replied", "call_booked", "proposal_sent"] as const;
  let n = 0;
  for (const name of names) {
    const l = await ravi.createLead(lead(name, `21455501${String(10 + n).padStart(2, "0")}`, { kit_id: k1.id, checks: ticks(5 + (n % 5)) }));
    const to = stagePlan[n]!;
    if (to !== "sourced") await ravi.moveStage(l.id, to, addDays(-(7 - n)));
    n++;
  }
  await ravi.createLead(lead("Gulf Coast Glow Spa", "8135550123", { category: "Med spas", city: "Tampa", state: "FL", kit_id: k3.id, checks: ticks(6) }));
  await asha.createLead(lead("Gamma Gutters", "2145550301", { checks: ticks(8) }));
  await asha.createLead(lead("Heights Roofing", "2145550302", { checks: ticks(6) }));
  const wonLead = await asha.createLead(lead("Iron Horse Roofing", "2145550303", { checks: ticks(9) }));
  await asha.moveStage(wonLead.id, "won", addDays(-1));

  for (const [i, nm] of ["Queue Roofing Co", "Katy Roof Doctors", "Legacy Roof Works"].entries()) {
    await meera.createLead(lead(nm, `2145550${600 + i}`, { checks: ticks(7 + i) }));
  }
  const q = await mia.unassignedQueue();
  const target = q.find((x) => x.business_name === "Legacy Roof Works");
  if (target) await mia.assignLead(target.owner, target.id, "asha");

  await asha.markRead("math");
  await mia.setRequired(["math", "filter"]);
  await owner.addApproval({ kind: "category-kit", fileId: "roofing", version: "00000000", note: "" }).catch(() => {});
}

/** The demo team plus a paused account (zed) and a brand-new one (newbie); returns every screen worth checking, by account. */
export async function seedFullDemo(pool: Pool): Promise<{ plan: [user: string, label: string, paths: string[]][] }> {
  await seedDemoTeam(pool);
  const createStore = (a: Actor | null) => createMySqlStore(a, pool);
  const owner = createStore({ username: "owner", role: "super_admin", team: null });
  await owner.createUser({ username: "zed", fullName: "Zed Zhao", role: "bd", team: "team-a", tempPasswordHash: await hashPassword("temp-zed") });
  await owner.createUser({ username: "newbie", fullName: "Nia Newbie", role: "bd", team: "team-a", tempPasswordHash: await hashPassword("temp-newbie") });
  await owner.changeUser("zed", { type: "suspend", reason: "On leave until the new quarter", until: "2099-01-31" });
  const ravi = createStore({ username: "ravi", role: "bd", team: "team-a" });
  const kitId = (await ravi.listKits())[0]!.id;
  const leadId = (await ravi.listLeads()).find((l) => l.stage === "replied")!.id;
  const meeraLead = (await createStore({ username: "meera", role: "researcher", team: "team-a" }).listLeads())[0]!.id;
  return {
    plan: [
      ["owner", "super-admin", ["/platform", "/platform/users", "/platform/workspace", "/platform/content", "/platform/features", "/platform/audit"]],
      ["ada", "admin", ["/admin", "/admin/users", "/admin/teams", "/admin/settings", "/admin/audit"]],
      ["mia", "manager", ["/team", "/queue", "/handover?from=ravi", "/kits", "/leads", `/leads/${leadId}`, "/review", "/playbook/progress", "/reports"]],
      ["ravi", "bd", ["/today", "/console", "/kits", `/kits/${kitId}`, `/kits/${kitId}?tab=leads`, `/kits/${kitId}?tab=activity`, `/kits/${kitId}?tab=settings`, "/leads", `/leads/${leadId}`, "/leads/new", "/leads/import", "/review", "/playbook", "/playbook/math", "/account", "/account/password"]],
      ["meera", "researcher", ["/sourcing", "/sourcing/finder", "/leads", `/leads/${meeraLead}`, "/leads/new", "/console", "/reports"]],
      ["vic", "viewer", ["/reports", "/playbook", "/kits"]],
      ["zed", "paused", ["/no-access"]],
      ["newbie", "first-sign-in", ["/account/password"]],
    ],
  };
}

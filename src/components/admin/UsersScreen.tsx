import { ROLES, ROLE_LABELS, canManage } from "@/lib/auth/roles";
import { readSignIns } from "@/lib/auth/lastSignIn";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { effectiveStatus } from "@/lib/auth/status";
import { getPool } from "@/lib/db/pool";
import { todayIso } from "@/lib/clock";
import { UsersAdmin, type UserRow } from "./UsersAdmin";

/** The data side of the Users screen, shared by /admin/users and /platform/users. */
export async function UsersScreen() {
  const s = await requirePerm("users.create");
  const store = storeFor(s);
  const [users, teams, signIns, leads] = await Promise.all([store.listUsers(), store.getTeams(), readSignIns(getPool()), store.listLeads()]);
  const today = todayIso();
  const rows: UserRow[] = await Promise.all(users.map(async (u) => {
    const status = effectiveStatus(u, today);
    return {
      username: u.username, fullName: u.fullName, role: u.role, roleLabel: ROLE_LABELS[u.role], team: u.team,
      teamName: teams.teams.find((t) => t.id === u.team)?.name ?? "No team", status,
      statusNote: status === "suspended" ? [u.statusReason, u.suspendedUntil ? `until ${u.suspendedUntil}` : ""].filter(Boolean).join(" · ") : "",
      lastSignIn: signIns[u.username] ?? null, createdBy: u.createdBy,
      manageable: u.username !== s.user.username && canManage(s.user.role, u.role),
      openLeads: leads.filter((l) => l.owner === u.username && l.stage !== "won" && l.stage !== "lost" && !l.superseded && l.pendingTo === null && l.heldBy === u.username).length,
    };
  }));
  const manageable = ROLES.filter((r) => canManage(s.user.role, r)).map((value) => ({ value, label: ROLE_LABELS[value] }));
  return <UsersAdmin rows={rows} teams={teams.teams.map((t) => ({ id: t.id, name: t.name }))} creatableRoles={manageable} assignableRoles={manageable} />;
}

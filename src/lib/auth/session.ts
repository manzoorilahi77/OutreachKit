// Turning a cookie into a session. Every request re-reads the user file, so a session ends when it is 14 days old,
// when the account's rev changed (reset, suspend, disable, enable, role or team change), or when the account isn't active.
import { SESSION_MS, verifySession } from "./cookie";
import { grantOf, PERMISSION_KEYS, type Grant, type PermissionKey } from "./permissions";
import { ROLE_HOMES } from "./roles";
import { effectiveStatus } from "./status";
import type { Store } from "@/lib/store/store";
import type { Actor, Team, UserFile } from "@/lib/store/types";

export type SessionUser = Pick<UserFile, "username" | "fullName" | "role" | "team" | "rev">;

export interface Session {
  user: SessionUser;
  profile: { defaultDevice: "desktop" | "mobile" };
  team: Team | null;
  perms: Record<PermissionKey, Grant>;
  mustChangePassword: boolean;
  issuedAt: number;
  expiresAt: number;
  home: string;
}

export type EndReason = "no_cookie" | "bad_cookie" | "expired" | "rev_changed" | "gone";

export type Resolved =
  | { kind: "none"; reason: EndReason }
  | { kind: "no_access"; username: string; fullName: string; status: "suspended" | "disabled"; reason: string; until: string | null }
  | { kind: "ok"; session: Session };

export const actorOf = (s: Session): Actor => ({ username: s.user.username, role: s.user.role, team: s.user.team });

/** A cookie from the future (a clock moved back) is trusted for a few minutes, no more. */
const SKEW_MS = 5 * 60 * 1000;

export async function resolveSession(token: string | undefined | null, o: { store: Store; forActor: (a: Actor) => Store; secret: string; now: Date }): Promise<Resolved> {
  if (!token) return { kind: "none", reason: "no_cookie" };
  const p = verifySession(token, o.secret);
  if (!p) return { kind: "none", reason: "bad_cookie" };
  const nowMs = o.now.getTime();
  if (p.issuedAt > nowMs + SKEW_MS) return { kind: "none", reason: "bad_cookie" };
  if (nowMs - p.issuedAt >= SESSION_MS) return { kind: "none", reason: "expired" };

  const user = await o.store.getUser(p.username);
  if (!user) return { kind: "none", reason: "gone" };

  const status = effectiveStatus(user, o.now.toISOString().slice(0, 10));
  if (status === "suspended" || status === "disabled") {
    return { kind: "no_access", username: user.username, fullName: user.fullName, status, reason: user.statusReason, until: status === "suspended" ? user.suspendedUntil : null };
  }
  if (user.rev !== p.rev) return { kind: "none", reason: "rev_changed" };

  const profile = await o.store.getProfile(user.username);
  const team = user.team ? ((await o.forActor({ username: user.username, role: user.role, team: user.team }).getTeams()).teams.find((t) => t.id === user.team) ?? null) : null;
  const subject = { role: user.role };
  return {
    kind: "ok",
    session: {
      user: { username: user.username, fullName: user.fullName, role: user.role, team: user.team, rev: user.rev },
      profile: { defaultDevice: profile?.defaultDevice ?? "desktop" },
      team,
      perms: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, grantOf(subject, k)])) as Record<PermissionKey, Grant>,
      mustChangePassword: !(profile?.passwordHash && profile.basedOnRev === user.pwRev),
      issuedAt: p.issuedAt,
      expiresAt: p.issuedAt + SESSION_MS,
      home: ROLE_HOMES[user.role],
    },
  };
}

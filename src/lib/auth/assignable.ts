import type { Session } from "./session";
import type { Store } from "@/lib/store/store";

/** BDs this person may give leads to: their team's for a manager, everyone's for an admin. */
export async function assignableBds(s: Session, store: Store): Promise<{ username: string; label: string }[]> {
  const scope = s.perms["leads.assign"].scope;
  return (await store.directory())
    .filter((d) => d.role === "bd" && d.status === "active" && (scope === "all" || d.team === s.user.team))
    .map((d) => ({ username: d.username, label: d.fullName }));
}

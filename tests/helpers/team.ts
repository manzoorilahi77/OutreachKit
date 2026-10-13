// A throwaway team/ folder for tests: an owner, a team, and a few accounts. bcrypt runs at its lowest cost.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/auth/roles";
import { createStore } from "@/lib/store/fileStore";
import { initTeam } from "@/lib/store/bootstrap";
import type { Store } from "@/lib/store/store";
import type { Actor } from "@/lib/store/types";
import type { Backend } from "../contract/backend";

export const hash = (pw: string) => bcrypt.hashSync(pw, 4);
export const OWNER: Actor = { username: "owner", role: "super_admin", team: null };

export async function tempRoot(prefix = "okit-"): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export async function initOwner(root: string) {
  await initTeam(root, {
    workspaceName: "Famysys", studio: "Famysys", demoDomain: "famysys.com", username: "owner", fullName: "Olive Owner",
    passwordHash: hash("owner-password-1"), unusableTempHash: hash("nobody-knows"),
  });
}

export const asActor = (root: string, username: string, role: Role, team: string | null = null): Store => createStore({ username, role, team }, root);

/** The standard cast: team-a (manager Mia, BDs Ravi and Asha, researcher Meera), team-b (manager Ben, BD Bo), viewer Vic, admin Ada. */
export async function seedCast(b: Backend) {
  await b.initOwner();
  const owner = b.storeFor(OWNER);
  await owner.saveTeams({ teams: [{ id: "team-a", name: "Team A", managers: [] }, { id: "team-b", name: "Team B", managers: [] }] });
  const mk = (username: string, fullName: string, role: Role, team: string | null) =>
    owner.createUser({ username, fullName, role, team, tempPasswordHash: hash(`temp-${username}`) });
  await mk("ada", "Ada Admin", "admin", null);
  await mk("mia", "Mia Manager", "manager", "team-a");
  await mk("ravi", "Ravi Rao", "bd", "team-a");
  await mk("asha", "Asha Aziz", "bd", "team-a");
  await mk("meera", "Meera Menon", "researcher", "team-a");
  await mk("ben", "Ben Brooks", "manager", "team-b");
  await mk("bryn", "Bryn Burns", "bd", "team-b");
  await mk("vic", "Vic Viewer", "viewer", null);
  const as = (username: string, role: Role, team: string | null = null) => b.storeFor({ username, role, team });
  return {
    owner,
    ada: as("ada", "admin"),
    mia: as("mia", "manager", "team-a"),
    ravi: as("ravi", "bd", "team-a"),
    asha: as("asha", "bd", "team-a"),
    meera: as("meera", "researcher", "team-a"),
    ben: as("ben", "manager", "team-b"),
    bryn: as("bryn", "bd", "team-b"),
    vic: as("vic", "viewer"),
  };
}

/** The same cast over a team/ folder. */
export const seedTeam = (root: string) =>
  seedCast({ storeFor: (actor) => createStore(actor, root), initOwner: () => initOwner(root), cleanup: async () => {} });

export const lead = (over: Record<string, unknown> = {}) => ({
  business_name: "Smith Roofing", owner_first_name: "", category: "Roofing", city: "Dallas", state: "TX", phone: "(214) 555-0101", email: "",
  instagram_handle: "", facebook_page: "", google_maps_url: "", website_found: null, website_url: "", site_verdict: "",
  google_review_count: null, google_rating: null, followers: null, last_post_date: null, demo_url: "", demo_built_date: null,
  first_contact_date: null, channel: null, notes: "", checks: {}, ...over,
});

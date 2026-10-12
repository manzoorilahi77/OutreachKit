// The Store: the only code that touches team/. Pages and actions call it and never use fs.
// A server database can later replace the file implementation without touching a screen.
// Every read of another person's folder is filtered by scopeOf(); every write is checked against the caller's own folder.
import type { Role } from "@/lib/auth/roles";
import type { PermissionKey } from "@/lib/auth/permissions";
import type { StageEvent } from "@/lib/leads/ratios";
import type { Channel, Stage } from "@/lib/leads/stages";
import type { BusinessRow } from "@/lib/scrape/types";
import type { DupHit, DupCandidate } from "./dupes";
import type { NewLeadInput } from "./leadModel";
import type {
  Actor, ApprovalRecord, Assignment, AuditEntry, KitRecord, KitStatus, LeadEvent, LeadView, PlaybookFile, Profile,
  TeamsFile, UserFile, Workspace,
} from "./types";

export interface DirectoryEntry {
  username: string;
  fullName: string;
  /** The name other people see in messages such as "already Ravi's lead". */
  firstName: string;
  role: Role;
  team: string | null;
  status: UserFile["status"];
}

/** A lead as a list shows it: who holds it now, and whether an accepted copy has taken its place. */
export type LeadListItem = LeadView & { heldBy: string | null; superseded: boolean; pendingTo: string | null };

export type UserChange =
  | { type: "reset_password"; tempPasswordHash: string }
  | { type: "suspend"; reason: string; until: string | null }
  | { type: "disable" }
  | { type: "enable" }
  | { type: "change_role"; role: Role }
  | { type: "move_team"; team: string | null };

export interface NewUser { username: string; fullName: string; role: Role; team: string | null; tempPasswordHash: string }

export interface TerritoryEntry { username: string; name: string; leads: number }

export interface KitStats { leads: number; contacted: number; replied: number; nextDue: string | null; lastActivity: string | null }

export interface Incoming { assignment: Assignment; lead: LeadView; from: string }

export interface ScopeData { leads: LeadListItem[]; events: LeadEvent[]; owners: string[] }

export type DupResult = { holder: string; holderName: string; businessName: string; matchedOn: string };

export interface NewBusiness {
  placeKey: string; scrapedOn: string; runId: string | null; query: string; category: string; city: string; state: string;
  name: string; phone: string; address: string; mapsCategory: string; rating: number | null; reviewCount: number | null;
  email: string; facebookUrl: string; instagramUrl: string; otherLinks: { label: string; url: string }[]; mapsUrl: string;
}

/** What the lead finder reads and writes: the runner's own folder, plus a look at everyone's keys to skip duplicates. */
export interface FinderStore {
  countSavedOn(day: string): Promise<number>;
  existingPlaceKeys(keys: string[]): Promise<Set<string>>;
  insertBusiness(b: NewBusiness): Promise<string | null>;
  getBusiness(id: string): Promise<BusinessRow | null>;
  listBusinesses(where: { category: string; city: string; state: string }, limit?: number): Promise<BusinessRow[]>;
  markMoved(id: string, leadId: string): Promise<boolean>;
  startRun(r: { query: string; category: string; city: string; state: string; limit: number }): Promise<string>;
  finishRun(id: string, c: { found: number; checked: number; skippedHasWebsite: number; skippedDuplicate: number; saved: number }, stopReason: string): Promise<void>;
}

export interface Store {
  readonly root: string;
  readonly actor: Actor | null;

  // Workspace and teams (read by anyone signed in; written by admins).
  getWorkspace(): Promise<Workspace>;
  saveWorkspace(w: Workspace): Promise<void>;
  getTeams(): Promise<TeamsFile>;
  saveTeams(t: TeamsFile): Promise<void>;

  // People.
  getUser(username: string): Promise<UserFile | null>;
  getProfile(username: string): Promise<Profile | null>;
  listUsers(): Promise<UserFile[]>;
  directory(): Promise<DirectoryEntry[]>;
  createUser(input: NewUser): Promise<UserFile>;
  changeUser(username: string, change: UserChange): Promise<UserFile>;
  saveProfile(patch: Partial<Pick<Profile, "defaultDevice" | "outreachHealth">>): Promise<Profile>;
  setOwnPassword(passwordHash: string, basedOnRev: number): Promise<void>;
  /** Open leads (not Won or Lost) of a person that have no handover or assignment record yet. */
  unhandedLeads(username: string): Promise<LeadView[]>;

  // Kits.
  createKit(input: { category: string; device: "desktop" | "mobile"; state: string; city: string; cityIsFree: boolean; direction: string; title?: string }): Promise<KitRecord>;
  listKits(): Promise<KitRecord[]>;
  getKit(owner: string, id: string): Promise<KitRecord | null>;
  updateKit(id: string, patch: { title?: string; status?: KitStatus }): Promise<KitRecord>;
  deleteKit(id: string): Promise<void>;
  territory(category: string, state: string, city: string): Promise<TerritoryEntry[]>;
  kitStats(kits: KitRecord[]): Promise<Map<string, KitStats>>;

  // Leads.
  createLead(input: NewLeadInput): Promise<LeadView>;
  importLeads(inputs: NewLeadInput[]): Promise<{ added: number }>;
  listLeads(opts?: { mine?: boolean }): Promise<LeadListItem[]>;
  getLead(owner: string, id: string): Promise<LeadListItem | null>;
  updateLead(id: string, input: NewLeadInput): Promise<LeadView>;
  moveStage(id: string, to: Stage, day: string): Promise<LeadView>;
  logTouch(id: string, channel: Channel, day: string): Promise<LeadView>;
  deleteLead(id: string): Promise<void>;
  findDuplicate(c: DupCandidate, opts?: { ignore?: { owner: string; id: string } }): Promise<DupResult | null>;
  /** The contact keys of every lead on this laptop, for the CSV import's duplicate check. No other detail. */
  knownContacts(): Promise<{ email: string; phone: string; google_maps_url: string }[]>;
  addComment(owner: string, id: string, note: string, day: string): Promise<LeadEvent>;
  leadEvents(owner: string, id: string): Promise<LeadEvent[]>;
  readScope(key: PermissionKey): Promise<ScopeData>;
  stageEvents(key: PermissionKey): Promise<StageEvent[]>;
  exportLeads(): Promise<LeadView[]>;

  // Hand-offs.
  unassignedQueue(): Promise<LeadListItem[]>;
  assignLead(owner: string, id: string, to: string, kind?: "assign" | "handover"): Promise<Assignment>;
  incoming(): Promise<Incoming[]>;
  acceptAssignment(assignmentId: string): Promise<LeadView>;
  listAssignments(): Promise<Assignment[]>;

  // Records.
  listAudit(limit?: number): Promise<AuditEntry[]>;
  getPlaybook(): Promise<PlaybookFile>;
  markRead(sectionId: string): Promise<void>;
  setRequired(sectionIds: string[]): Promise<void>;
  requiredFor(username: string): Promise<string[]>;
  playbookProgress(): Promise<{ user: DirectoryEntry; reads: Record<string, string>; required: string[] }[]>;
  listApprovals(): Promise<ApprovalRecord[]>;
  addApproval(a: Omit<ApprovalRecord, "id" | "approvedAt">): Promise<ApprovalRecord>;

  finder(): FinderStore;
}

export type { DupHit };

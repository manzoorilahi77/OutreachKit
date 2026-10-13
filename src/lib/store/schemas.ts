// A JSON Schema for every file under team/, validated with ajv. Reads tolerate extra fields (a newer app may add some);
// writes are validated before they touch the disk.
import Ajv, { type ValidateFunction } from "ajv";
import { ROLES } from "@/lib/auth/roles";
import { CHECK_FIELDS } from "@/lib/leads/checks";

const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
const int = { type: "integer", minimum: 0 } as const;
const nnum = { type: ["number", "null"] } as const;
const nint = { type: ["integer", "null"] } as const;
const bool = { type: "boolean" } as const;
const nbool = { type: ["boolean", "null"] } as const;
const DATE = "^\\d{4}-\\d{2}-\\d{2}$";
const date = { type: "string", pattern: DATE } as const;
const ndate = { type: ["string", "null"], pattern: `${DATE}|^$` } as const;
const STAGES = ["sourced", "qualified", "demo_built", "contacted", "replied", "call_booked", "proposal_sent", "won", "lost", "nurture"];

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", properties, required, additionalProperties: true });

export const SCHEMAS = {
  schema: obj({ version: { type: "integer", minimum: 1 } }, ["version"]),

  workspace: obj({
    name: str, studio: str, demoDomain: str, basedLine: str,
    features: obj({ leadFinder: bool, softwareTrack: bool }, ["leadFinder", "softwareTrack"]),
    markets: obj({ rates: obj({ CAD: { type: "number", exclusiveMinimum: 0 }, AED: { type: "number", exclusiveMinimum: 0 } }, ["CAD", "AED"]) }, ["rates"]),
    outreachHealth: { type: "object" },
  }, ["name", "studio", "demoDomain", "basedLine", "features"]),

  teams: obj({
    teams: { type: "array", items: obj({ id: { type: "string", pattern: "^[a-z0-9-]{1,40}$" }, name: str, managers: { type: "array", items: str } }, ["id", "name", "managers"]) },
  }, ["teams"]),

  user: obj({
    username: str, fullName: str, role: { enum: [...ROLES] }, team: nstr,
    status: { enum: ["active", "suspended", "disabled"] }, statusReason: str, suspendedUntil: ndate,
    tempPasswordHash: str, rev: int, pwRev: int, createdBy: str, createdAt: str, updatedAt: str,
  }, ["username", "fullName", "role", "team", "status", "statusReason", "suspendedUntil", "tempPasswordHash", "rev", "pwRev", "createdBy", "createdAt", "updatedAt"]),

  profile: obj({
    defaultDevice: { enum: ["desktop", "mobile"] }, passwordHash: nstr, basedOnRev: nint, outreachHealth: { type: "object" },
  }, ["defaultDevice", "passwordHash", "basedOnRev"]),

  kit: obj({
    id: str, owner: str, title: str, status: { enum: ["draft", "active", "paused", "archived"] }, category: str,
    device: { enum: ["desktop", "mobile"] }, state: str, city: str, city_is_free: bool, direction: str, site_lang: { enum: ["en", "ar", "bi"] }, created_at: str, updated_at: str,
  }, ["id", "owner", "title", "status", "category", "device", "state", "city", "city_is_free", "direction", "created_at", "updated_at"]),

  lead: obj({
    id: str, owner: str, assignedTo: nstr,
    sourceRef: { anyOf: [{ type: "null" }, obj({ owner: str, id: str }, ["owner", "id"])] },
    kit_id: nstr, date_sourced: date,
    business_name: { type: "string", minLength: 1 }, owner_first_name: str, category: str, city: str, state: str,
    phone: str, email: str, instagram_handle: str, facebook_page: str, google_maps_url: str,
    website_found: nbool, website_url: str, site_verdict: str,
    google_review_count: nint, google_rating: nnum, followers: nint, last_post_date: ndate,
    demo_url: str, demo_built_date: ndate, first_contact_date: ndate,
    channel: { enum: ["instagram_dm", "facebook_dm", "whatsapp", "call", "email", "other", null] },
    replied: bool, stage: { enum: STAGES }, next_action_date: ndate, notes: str, sequence_step: int, created_at: str, updated_at: str,
    ...Object.fromEntries(CHECK_FIELDS.map((f) => [f, bool])),
  }, ["id", "owner", "assignedTo", "sourceRef", "kit_id", "date_sourced", "business_name", "category", "city", "state", "stage", "replied", "sequence_step", "created_at", "updated_at", ...CHECK_FIELDS]),

  event: obj({
    id: str, lead_owner: str, lead_id: str, by: str, kind: { enum: ["stage_change", "touch", "comment"] },
    from_stage: { enum: [...STAGES, null] }, to_stage: { enum: [...STAGES, null] }, channel: nstr, occurred_on: date, note: str, created_at: str,
  }, ["id", "lead_owner", "lead_id", "by", "kind", "from_stage", "to_stage", "occurred_on", "note", "created_at"]),

  assignment: obj({
    id: str, kind: { enum: ["assign", "handover"] }, by: str, leadOwner: str, leadId: str, business: str, to: str, at: str,
  }, ["id", "kind", "by", "leadOwner", "leadId", "business", "to", "at"]),

  audit: obj({ id: str, at: str, actor: str, action: str, target: str, detail: str }, ["id", "at", "actor", "action", "target", "detail"]),

  playbook: obj({ reads: { type: "object", additionalProperties: str }, required: { type: "array", items: str } }, ["reads", "required"]),

  approvals: obj({
    approvals: { type: "array", items: obj({ id: str, kind: { enum: ["category-kit", "segment"] }, fileId: str, version: str, approvedAt: str, note: str }, ["id", "kind", "fileId", "version", "approvedAt", "note"]) },
  }, ["approvals"]),

  finderLine: {
    type: "object",
    required: ["kind", "id"],
    properties: { kind: { enum: ["business", "moved"] }, id: str },
    additionalProperties: true,
  },

  finderRunLine: {
    type: "object",
    required: ["kind", "id", "at"],
    properties: { kind: { enum: ["start", "finish"] }, id: str, at: str },
    additionalProperties: true,
  },
} as const;

export type SchemaName = keyof typeof SCHEMAS;

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = new Map<SchemaName, ValidateFunction>();

function validator(name: SchemaName): ValidateFunction {
  let v = compiled.get(name);
  if (!v) {
    v = ajv.compile(SCHEMAS[name] as object);
    compiled.set(name, v);
  }
  return v;
}

export function validateFile(name: SchemaName, data: unknown): { ok: true } | { ok: false; error: string } {
  const v = validator(name);
  if (v(data)) return { ok: true };
  const e = v.errors?.[0];
  return { ok: false, error: `${name}: ${e?.instancePath || "(root)"} ${e?.message ?? "is not valid"}` };
}

export function assertValid(name: SchemaName, data: unknown): void {
  const r = validateFile(name, data);
  if (!r.ok) throw new Error(`Refusing to write an invalid file. ${r.error}`);
}

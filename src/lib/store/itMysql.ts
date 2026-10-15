// The MySQL ItStore: IT Prospects' own tables (db/migrations/0004_it_prospects.sql). Nothing here reads or writes the
// leads, the lead finder or their keys. Scope works as for leads: a person sees the prospects whose owner or assignee is
// within their scope of the it.* key; only the owner or the assignee edits one.
import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { can, type PermissionKey } from "@/lib/auth/permissions";
import { isRole } from "@/lib/auth/roles";
import { firstName } from "@/lib/auth/status";
import { nowIso, todayIso } from "@/lib/clock";
import { fromDbDate, fromDbTime, toDbTime } from "@/lib/db/time";
import { IT_KEY_LABEL, prospectKeys, type ItKeyKind, type KeySource } from "@/lib/it/keys";
import {
  EMPTY_QUALIFIER, isItStage, QUALIFIER, toProspectView, type ItEvent, type ItProspect, type ItProspectInput, type ItProspectView, type ItSignal, type ItSignalInput,
  type ItStage, type ProspectSource, type Qualifier,
} from "@/lib/it/model";
import type { BusinessRow } from "@/lib/scrape/types";
import type { Actor } from "./types";
import { finderKeys } from "./dupes";
import { StoreError } from "./errors";
import type { FinderStore, ItDup, ItStore, NewBusiness } from "./store";

type Conn = Pool | PoolConnection;
type Row = RowDataPacket;

/** What the MySQL Store lends this one: its pool, its checks and its transaction. */
export interface ItContext {
  pool: Pool;
  me(): Actor;
  need(key: PermissionKey): unknown;
  owners(key: PermissionKey, c?: Conn): Promise<string[]>;
  tx<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T>;
  audit(c: Conn, action: string, target: string, detail?: string): Promise<void>;
  dbKey(k: string): string;
}

async function rows(c: Conn, sql: string, params: unknown[] = []): Promise<Row[]> {
  const [r] = await c.query<RowDataPacket[]>(sql, params);
  return r;
}
async function exec(c: Conn, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [r] = await c.query<ResultSetHeader>(sql, params);
  return r;
}
const isDupEntry = (e: unknown) => (e as { errno?: number } | null)?.errno === 1062;
const nnum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const parseJson = <T>(v: unknown): T | null => (v === null || v === undefined ? null : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

const MAX_NOTE = 1000;

const qualifierOf = (v: unknown): Qualifier => {
  const q = parseJson<Partial<Qualifier>>(v) ?? {};
  return Object.fromEntries(QUALIFIER.map((f) => [f.key, q[f.key] === true])) as Qualifier;
};

const prospectOf = (r: Row): ItProspect => ({
  id: r.id, owner: r.owner, assignee: r.assignee, segment: r.segment, company: r.company, companyDomain: r.company_domain, websiteUrl: r.website_url,
  linkedinUrl: r.linkedin_url, contactName: r.contact_name, contactTitle: r.contact_title, email: r.email, phone: r.phone, whatsapp: r.whatsapp, city: r.city,
  region: r.region, country: r.country, teamSize: r.team_size, mapsUrl: r.maps_url, mapsCategory: r.maps_category, rating: nnum(r.rating),
  reviewCount: nnum(r.review_count), stage: r.stage, qualifier: qualifierOf(r.qualifier), notes: r.notes, source: r.source,
  createdAt: fromDbTime(r.created_at), updatedAt: fromDbTime(r.updated_at),
});

const signalOf = (r: Row): ItSignal => ({
  id: r.id, prospectId: r.prospect_id, type: r.signal_type, url: r.url, quote: r.quote, signalDate: fromDbDate(r.signal_date), source: r.source,
  addedBy: r.added_by, createdAt: fromDbTime(r.created_at),
});

const eventOf = (r: Row): ItEvent => ({
  id: r.id, prospectId: r.prospect_id, by: r.by_user, kind: r.kind, fromStage: r.from_stage, toStage: r.to_stage, note: r.note, createdAt: fromDbTime(r.created_at),
});

const businessOf = (r: Row): BusinessRow => ({
  id: r.id, placeKey: r.place_key, scrapedOn: fromDbDate(r.scraped_on)!, scrapedAt: fromDbTime(r.scraped_at), query: r.query, category: r.category, city: r.city,
  state: r.state, name: r.name, phone: r.phone, address: r.address, mapsCategory: r.maps_category, rating: nnum(r.rating), reviewCount: nnum(r.review_count),
  email: r.email, facebookUrl: r.facebook_url, instagramUrl: r.instagram_url, otherLinks: parseJson<{ label: string; url: string }[]>(r.other_links) ?? [],
  mapsUrl: r.maps_url, movedLeadId: r.prospect_id, hasWebsite: !!r.has_website, websiteUrl: r.website_url ?? "", whatsapp: r.whatsapp ?? "",
});

/** The column values the form sets, in the order of FORM_COLS. */
const FORM_COLS = [
  "segment", "company", "company_domain", "website_url", "linkedin_url", "contact_name", "contact_title", "email", "phone", "whatsapp", "city", "region", "country",
  "team_size", "maps_url", "maps_category", "rating", "review_count", "notes",
] as const;
const formValues = (i: ItProspectInput, keep?: ItProspect) => [
  i.segment, i.company.slice(0, 255), i.companyDomain.slice(0, 255), i.websiteUrl.slice(0, 1000), i.linkedinUrl.slice(0, 1000), i.contactName.slice(0, 200),
  i.contactTitle.slice(0, 200), i.email.slice(0, 255), i.phone.slice(0, 100), i.whatsapp.slice(0, 300), i.city.slice(0, 200), i.region.slice(0, 10), i.country,
  i.teamSize.slice(0, 16), (i.mapsUrl ?? keep?.mapsUrl ?? "").slice(0, 1000), (i.mapsCategory ?? keep?.mapsCategory ?? "").slice(0, 200),
  i.rating !== undefined ? i.rating : (keep?.rating ?? null), i.reviewCount !== undefined ? i.reviewCount : (keep?.reviewCount ?? null), i.notes,
];

const keySource = (p: { companyDomain: string; email: string; phone: string; mapsUrl?: string; company: string; city: string }): KeySource => ({
  companyDomain: p.companyDomain, email: p.email, phone: p.phone, mapsUrl: p.mapsUrl ?? "", company: p.company, city: p.city,
});

class MySqlItStore implements ItStore {
  constructor(private readonly x: ItContext) {}

  private get pool() { return this.x.pool; }
  private me() { return this.x.me(); }

  /** The people whose prospects the caller sees under `key`. */
  private async scope(key: PermissionKey, c: Conn = this.pool): Promise<Set<string>> {
    this.x.need(key);
    return new Set(await this.x.owners(key, c));
  }

  private inScope(p: { owner: string; assignee: string | null }, names: Set<string>) {
    return names.has(p.owner) || (p.assignee !== null && names.has(p.assignee));
  }

  private canEdit(p: { owner: string; assignee: string | null }) {
    const me = this.me().username;
    return can(this.me(), "it.edit") && (p.owner === me || p.assignee === me);
  }

  private async views(c: Conn, ps: ItProspect[]): Promise<ItProspectView[]> {
    if (!ps.length) return [];
    const sigs = await rows(c, "SELECT * FROM it_signals WHERE prospect_id IN (?)", [ps.map((p) => p.id)]);
    const by = new Map<string, ItSignal[]>();
    for (const r of sigs) {
      const s = signalOf(r);
      by.set(s.prospectId, [...(by.get(s.prospectId) ?? []), s]);
    }
    const today = todayIso();
    return ps.map((p) => toProspectView(p, by.get(p.id) ?? [], today));
  }

  private async scoped(key: PermissionKey): Promise<ItProspectView[]> {
    const names = [...(await this.scope(key))];
    if (!names.length) return [];
    const ps = (await rows(this.pool, "SELECT * FROM it_prospects WHERE owner IN (?) OR assignee IN (?) ORDER BY updated_at DESC, id", [names, names])).map(prospectOf);
    return this.views(this.pool, ps);
  }

  /** Locks the prospect for the rest of the transaction; refuses unless the caller may edit it. */
  private async editable(c: PoolConnection, id: string): Promise<ItProspect> {
    this.x.need("it.edit");
    const r = (await rows(c, "SELECT * FROM it_prospects WHERE id = ? FOR UPDATE", [id]))[0];
    if (!r) throw new StoreError("That prospect isn't there any more.", "not_found");
    const p = prospectOf(r);
    if (!this.canEdit(p)) throw new StoreError("Only the prospect's owner or the person it's assigned to can change it.", "forbidden");
    return p;
  }

  private async event(c: Conn, prospectId: string, kind: ItEvent["kind"], note = "", from: ItStage | null = null, to: ItStage | null = null) {
    await exec(c, "INSERT INTO it_events (id, prospect_id, by_user, kind, from_stage, to_stage, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [randomUUID(), prospectId, this.me().username, kind, from, to, note, toDbTime(nowIso())]);
  }

  private async view(c: Conn, id: string): Promise<ItProspectView> {
    const r = (await rows(c, "SELECT * FROM it_prospects WHERE id = ?", [id]))[0];
    if (!r) throw new StoreError("That prospect isn't there any more.", "not_found");
    return (await this.views(c, [prospectOf(r)]))[0]!;
  }

  /** The first prospect holding any of the keys, other than `ignoreId`. */
  private async clash(c: Conn, keys: string[], ignoreId?: string): Promise<ItDup | null> {
    if (!keys.length) return null;
    const dbKeys = keys.map((k) => this.x.dbKey(k));
    const hits = await rows(c, `SELECT k.key_value, p.id, p.company, p.owner, p.assignee, u.full_name FROM it_keys k JOIN it_prospects p ON p.id = k.prospect_id
      LEFT JOIN users u ON u.username = p.owner WHERE k.key_value IN (?)${ignoreId ? " AND p.id <> ?" : ""}`, ignoreId ? [dbKeys, ignoreId] : [dbKeys]);
    if (!hits.length) return null;
    // Report the most specific key first, in the order prospectKeys gives them.
    const hit = hits.sort((a, b) => dbKeys.indexOf(a.key_value) - dbKeys.indexOf(b.key_value))[0]!;
    const kind = keys[dbKeys.indexOf(hit.key_value)]![0] as ItKeyKind;
    return {
      prospectId: hit.id, company: hit.company, holder: hit.owner, holderName: hit.full_name ? firstName(hit.full_name, hit.owner) : hit.owner,
      matchedOn: IT_KEY_LABEL[kind] ?? "a key", canEdit: this.canEdit({ owner: hit.owner, assignee: hit.assignee }),
    };
  }

  private dupError(d: ItDup): StoreError {
    const whose = d.holder === this.me().username ? "your" : `${d.holderName}'s`;
    return new StoreError(`Already ${whose} prospect “${d.company}” (same ${d.matchedOn}).`, "duplicate");
  }

  private async writeKeys(c: PoolConnection, id: string, keys: string[]) {
    await exec(c, "DELETE FROM it_keys WHERE prospect_id = ?", [id]);
    if (!keys.length) return;
    try {
      await exec(c, "INSERT INTO it_keys (key_value, prospect_id) VALUES ?", [[...new Set(keys.map((k) => this.x.dbKey(k)))].map((k) => [k, id])]);
    } catch (e) {
      if (isDupEntry(e)) {
        const d = await this.clash(c, keys, id);
        throw d ? this.dupError(d) : new StoreError("Another prospect was saved with the same details a moment ago.", "duplicate");
      }
      throw e;
    }
  }

  private async insertSignal(c: Conn, prospectId: string, s: ItSignalInput): Promise<ItSignal> {
    const sig: ItSignal = {
      id: randomUUID(), prospectId, type: s.type, url: s.url.slice(0, 1000), quote: s.quote.slice(0, 2000), signalDate: s.signalDate, source: s.source.slice(0, 40),
      addedBy: this.me().username, createdAt: nowIso(),
    };
    await exec(c, "INSERT INTO it_signals (id, prospect_id, signal_type, url, quote, signal_date, source, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [sig.id, prospectId, sig.type, sig.url, sig.quote, sig.signalDate, sig.source, sig.addedBy, toDbTime(sig.createdAt)]);
    return sig;
  }

  // ---------- reads ----------
  listProspects() { return this.scoped("it.view"); }

  async getProspect(id: string) {
    const names = await this.scope("it.view");
    const r = (await rows(this.pool, "SELECT * FROM it_prospects WHERE id = ?", [id]))[0];
    if (!r) return null;
    const p = prospectOf(r);
    return this.inScope(p, names) ? (await this.views(this.pool, [p]))[0]! : null;
  }

  async events(id: string) {
    const p = await this.getProspect(id);
    if (!p) throw new StoreError("That prospect isn't there any more.", "not_found");
    return (await rows(this.pool, "SELECT * FROM it_events WHERE prospect_id = ? ORDER BY seq", [id])).map(eventOf);
  }

  async findDuplicate(c: KeySource, opts: { ignoreId?: string } = {}) {
    this.x.need("it.add");
    return this.clash(this.pool, prospectKeys(c), opts.ignoreId);
  }

  async assignable() {
    const names = [...(await this.scope("it.assign"))];
    if (!names.length) return [];
    const users = await rows(this.pool, "SELECT username, full_name, role FROM users WHERE username IN (?) AND status = 'active' ORDER BY full_name", [names]);
    return users.filter((u) => isRole(u.role) && can(u.role, "it.edit")).map((u) => ({ username: u.username, fullName: u.full_name, firstName: firstName(u.full_name, u.username) }));
  }

  async exportProspects() {
    const out = await this.scoped("it.export");
    await this.x.audit(this.pool, "it.export", "it_prospects", `${out.length} rows`);
    return out;
  }

  // ---------- writes ----------
  async createProspect(input: ItProspectInput, opts: { signal?: ItSignalInput | null; source?: ProspectSource; finderBusinessId?: string } = {}) {
    this.x.need("it.add");
    const me = this.me().username;
    const keys = prospectKeys(keySource(input));
    return this.x.tx(async (c) => {
      const dup = await this.clash(c, keys);
      if (dup) throw this.dupError(dup);
      const id = randomUUID();
      const at = toDbTime(nowIso());
      await exec(c, `INSERT INTO it_prospects (id, owner, assignee, ${FORM_COLS.join(", ")}, stage, qualifier, source, created_at, updated_at)
        VALUES (?, ?, NULL, ${FORM_COLS.map(() => "?").join(", ")}, 'new', ?, ?, ?, ?)`,
        [id, me, ...formValues(input), JSON.stringify(EMPTY_QUALIFIER), opts.source ?? "manual", at, at]);
      await this.writeKeys(c, id, keys);
      if (opts.signal) await this.insertSignal(c, id, opts.signal);
      if (opts.finderBusinessId) {
        const r = await exec(c, "UPDATE it_finder_businesses SET prospect_id = ?, added_at = ? WHERE id = ? AND owner = ? AND prospect_id IS NULL", [id, at, opts.finderBusinessId, me]);
        if (!r.affectedRows) throw new StoreError("That business was already added.", "conflict");
      }
      await this.event(c, id, "created", opts.source && opts.source !== "manual" ? `From the ${opts.source === "finder" ? "IT finder" : opts.source === "signal" ? "signals inbox" : "CSV import"}` : "");
      await this.x.audit(c, "it.add", `it:${id}`, input.company);
      return this.view(c, id);
    });
  }

  async updateProspect(id: string, input: ItProspectInput) {
    return this.x.tx(async (c) => {
      const p = await this.editable(c, id);
      const keys = prospectKeys(keySource({ ...input, mapsUrl: input.mapsUrl ?? p.mapsUrl }));
      await exec(c, `UPDATE it_prospects SET ${FORM_COLS.map((col) => `${col} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, [...formValues(input, p), toDbTime(nowIso()), id]);
      await this.writeKeys(c, id, keys);
      return this.view(c, id);
    });
  }

  async setQualifier(id: string, q: Qualifier) {
    return this.x.tx(async (c) => {
      await this.editable(c, id);
      const clean = Object.fromEntries(QUALIFIER.map((f) => [f.key, q[f.key] === true]));
      await exec(c, "UPDATE it_prospects SET qualifier = ?, updated_at = ? WHERE id = ?", [JSON.stringify(clean), toDbTime(nowIso()), id]);
      return this.view(c, id);
    });
  }

  async moveStage(id: string, to: ItStage) {
    if (!isItStage(to)) throw new StoreError("That isn't a stage.");
    return this.x.tx(async (c) => {
      const p = await this.editable(c, id);
      if (p.stage !== to) {
        await exec(c, "UPDATE it_prospects SET stage = ?, updated_at = ? WHERE id = ?", [to, toDbTime(nowIso()), id]);
        await this.event(c, id, "stage", "", p.stage, to);
      }
      return this.view(c, id);
    });
  }

  async assign(id: string, to: string | null) {
    return this.x.tx(async (c) => {
      const names = await this.scope("it.assign", c);
      const r = (await rows(c, "SELECT * FROM it_prospects WHERE id = ? FOR UPDATE", [id]))[0];
      if (!r) throw new StoreError("That prospect isn't there any more.", "not_found");
      const p = prospectOf(r);
      if (!this.inScope(p, names)) throw new StoreError("That prospect is outside your team.", "forbidden");
      if (to !== null) {
        const u = (await rows(c, "SELECT username, full_name, role, status FROM users WHERE username = ?", [to]))[0];
        if (!u || !names.has(to)) throw new StoreError("You can only assign to someone in your team.", "forbidden");
        if (u.status !== "active" || !isRole(u.role) || !can(u.role, "it.edit")) throw new StoreError("That person can't work prospects.");
      }
      const next = to === p.owner ? null : to;
      if (next !== p.assignee) {
        await exec(c, "UPDATE it_prospects SET assignee = ?, updated_at = ? WHERE id = ?", [next, toDbTime(nowIso()), id]);
        await this.event(c, id, "assign", next ?? "");
        await this.x.audit(c, "it.assign", `it:${id}`, next ?? "unassigned");
      }
      return this.view(c, id);
    });
  }

  async deleteProspect(id: string) {
    await this.x.tx(async (c) => {
      const p = await this.editable(c, id);
      if (p.owner !== this.me().username) throw new StoreError("Only the person who added a prospect can delete it.", "forbidden");
      await exec(c, "UPDATE it_finder_businesses SET prospect_id = NULL, added_at = NULL WHERE prospect_id = ?", [id]);
      await exec(c, "DELETE FROM it_prospects WHERE id = ?", [id]);
      await this.x.audit(c, "it.delete", `it:${id}`, p.company);
    });
  }

  async addSignal(id: string, s: ItSignalInput) {
    this.x.need("it.add");
    return this.x.tx(async (c) => {
      await this.editable(c, id);
      if (s.url && (await rows(c, "SELECT 1 FROM it_signals WHERE prospect_id = ? AND url = ? LIMIT 1", [id, s.url])).length) {
        throw new StoreError("This prospect already has that signal.", "duplicate");
      }
      const sig = await this.insertSignal(c, id, s);
      await exec(c, "UPDATE it_prospects SET updated_at = ? WHERE id = ?", [toDbTime(nowIso()), id]);
      await this.event(c, id, "signal", s.type);
      return sig;
    });
  }

  async deleteSignal(id: string, signalId: string) {
    await this.x.tx(async (c) => {
      await this.editable(c, id);
      await exec(c, "DELETE FROM it_signals WHERE id = ? AND prospect_id = ?", [signalId, id]);
    });
  }

  async addComment(id: string, note: string) {
    const text = note.trim();
    if (!text) throw new StoreError("Write a comment first.");
    if (text.length > MAX_NOTE) throw new StoreError(`A comment is at most ${MAX_NOTE} characters.`);
    const names = await this.scope("it.comment");
    const r = (await rows(this.pool, "SELECT owner, assignee FROM it_prospects WHERE id = ?", [id]))[0];
    if (!r || !this.inScope({ owner: r.owner, assignee: r.assignee }, names)) throw new StoreError("That prospect isn't there any more.", "not_found");
    const ev: ItEvent = { id: randomUUID(), prospectId: id, by: this.me().username, kind: "comment", fromStage: null, toStage: null, note: text, createdAt: nowIso() };
    await exec(this.pool, "INSERT INTO it_events (id, prospect_id, by_user, kind, from_stage, to_stage, note, created_at) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)",
      [ev.id, id, ev.by, "comment", text, toDbTime(ev.createdAt)]);
    return ev;
  }

  // ---------- the IT finder ----------
  finder(): FinderStore {
    const need = () => { this.x.need("it.finder"); return this.me().username; };
    return {
      countSavedOn: async (day) => {
        const me = need();
        return Number((await rows(this.pool, "SELECT COUNT(*) AS n FROM it_finder_businesses WHERE owner = ? AND scraped_on = ?", [me, day]))[0]?.n ?? 0);
      },
      existingPlaceKeys: async (keys) => {
        need();
        const known = new Set<string>();
        if (!keys.length) return known;
        for (const r of await rows(this.pool, "SELECT DISTINCT place_key FROM it_finder_businesses WHERE place_key IN (?)", [keys])) known.add(r.place_key);
        const asKey = new Map(keys.map((k) => [this.x.dbKey("m:" + k), k]));
        for (const r of await rows(this.pool, "SELECT key_value FROM it_keys WHERE key_value IN (?)", [[...asKey.keys()]])) {
          const k = asKey.get(r.key_value);
          if (k) known.add(k);
        }
        return known;
      },
      insertBusiness: async (b: NewBusiness) => {
        const me = need();
        const keys = [...new Set(finderKeys(b).map((k) => this.x.dbKey(k)))];
        try {
          return await this.x.tx(async (c) => {
            if ((await rows(c, "SELECT 1 FROM it_keys WHERE key_value IN (?) LIMIT 1", [keys])).length) throw new StoreError("clash", "duplicate");
            const id = randomUUID();
            await exec(c, `INSERT INTO it_finder_businesses (id, owner, place_key, scraped_on, scraped_at, run_id, query, category, city, state, name, phone, address,
              maps_category, rating, review_count, email, facebook_url, instagram_url, other_links, maps_url, has_website, website_url, whatsapp)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, me, b.placeKey.slice(0, 512), b.scrapedOn, toDbTime(nowIso()), b.runId, b.query.slice(0, 300), b.category.slice(0, 200), b.city.slice(0, 200), b.state,
              b.name.slice(0, 255), b.phone.slice(0, 60), b.address.slice(0, 500), b.mapsCategory.slice(0, 200), b.rating, b.reviewCount, b.email.slice(0, 255),
              b.facebookUrl.slice(0, 500), b.instagramUrl.slice(0, 500), JSON.stringify(b.otherLinks), b.mapsUrl.slice(0, 1000), b.hasWebsite ? 1 : 0,
              b.websiteUrl.slice(0, 1000), b.whatsapp.slice(0, 300)]);
            try {
              await exec(c, "INSERT INTO it_finder_keys (business_id, key_value) VALUES ?", [keys.map((k) => [id, k])]);
            } catch (e) {
              if (isDupEntry(e)) throw new StoreError("clash", "duplicate");
              throw e;
            }
            return id;
          });
        } catch (e) {
          if (e instanceof StoreError && e.code === "duplicate") return null;
          throw e;
        }
      },
      getBusiness: async (id) => {
        const me = need();
        const r = (await rows(this.pool, "SELECT * FROM it_finder_businesses WHERE id = ? AND owner = ?", [id, me]))[0];
        return r ? businessOf(r) : null;
      },
      listBusinesses: async (where, limit = 500) => {
        const me = need();
        return (await rows(this.pool, "SELECT * FROM it_finder_businesses WHERE owner = ? AND category = ? AND city = ? AND state = ? ORDER BY scraped_at DESC, id DESC LIMIT ?",
          [me, where.category, where.city, where.state, Math.max(0, Math.floor(limit))])).map(businessOf);
      },
      markMoved: async (id, prospectId) => {
        const me = need();
        const r = await exec(this.pool, "UPDATE it_finder_businesses SET prospect_id = ?, added_at = ? WHERE id = ? AND owner = ? AND prospect_id IS NULL",
          [prospectId.slice(0, 36), toDbTime(nowIso()), id, me]);
        return r.affectedRows > 0;
      },
      startRun: async (r) => {
        const me = need();
        const id = randomUUID();
        await exec(this.pool, "INSERT INTO it_finder_runs (id, owner, started_at, query, category, city, state, run_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [id, me, toDbTime(nowIso()), r.query.slice(0, 300), r.category.slice(0, 200), r.city.slice(0, 200), r.state, r.limit]);
        return id;
      },
      finishRun: async (id, c, stopReason) => {
        const me = need();
        await exec(this.pool, "UPDATE it_finder_runs SET finished_at = ?, found = ?, checked = ?, skipped_duplicate = ?, saved = ?, stop_reason = ? WHERE id = ? AND owner = ?",
          [toDbTime(nowIso()), c.found, c.checked, c.skippedDuplicate, c.saved, stopReason.slice(0, 500), id, me]);
      },
    };
  }
}

export const createMySqlItStore = (x: ItContext): ItStore => new MySqlItStore(x);

// Copies a team/ folder (read by teamSource.ts) into MySQL. It never changes the source.
// Re-runnable: a record already in the database is left exactly as it is (the database is the newer copy once the app runs on it),
// so a second run adds only what is new. The whole import is one transaction: a dry run rolls it back, --apply commits it.
// Nothing is dropped quietly: a record that can't be imported is listed with the reason, and the counts must add up.
import type { Pool, RowDataPacket } from "mysql2/promise";
import { toDbDate, toDbTime } from "@/lib/db/time";
import { KEY_LABEL, dupKeys, finderKeys } from "./dupes";
import { StoreError } from "./errors";
import { LEAD_COLS, dbKey, fits, leadValues } from "./mysqlStore";
import { KINDS, type Kind, type Problem, type TeamSource } from "./teamSource";

export interface KindReport {
  kind: Kind;
  /** Records in the source files, usable or not. */
  found: number;
  /** Of those, how many passed the schema and the file-location checks. */
  valid: number;
  inserted: number;
  /** Already in the database; left untouched. */
  present: number;
  /** Valid in the files, but the database refused them (see the problem list). */
  rejected: number;
}

export interface Clash { type: "lead" | "business"; record: string; businessName: string; matchedOn: string; sameAs: string }

export interface ImportReport {
  apply: boolean;
  kinds: KindReport[];
  /** Reader problems and import-time rejections, in the order they were found. */
  problems: Problem[];
  /** Duplicate-key clashes: the record is kept, without the key it shares. */
  clashes: Clash[];
  notes: string[];
  /** Rows in each table after the import (inside the transaction, so a dry run shows what --apply would leave). */
  tableRows: Record<string, number>;
  /** True when every kind adds up: valid = inserted + present + rejected. */
  reconciled: boolean;
}

const DATA_ERRNOS = new Set([1406, 1048, 1264, 1265, 1366, 1292, 1452, 3819, 3140, 1253, 1300]);
const errno = (e: unknown): number | undefined => (e as { errno?: number } | null)?.errno;
const sqlMessage = (e: unknown): string => String((e as { sqlMessage?: string } | null)?.sqlMessage ?? (e as Error).message).slice(0, 200);
const json = (v: unknown) => (v === undefined || v === null ? null : JSON.stringify(v));

const TABLES = [
  "workspace", "teams", "team_managers", "users", "profiles", "kits", "leads", "lead_keys", "lead_events", "assignments", "audit_log", "playbook_reads",
  "playbook_required", "approvals", "finder_runs", "finder_businesses", "business_keys",
];

export async function importTeam(pool: Pool, src: TeamSource, o: { apply: boolean }): Promise<ImportReport> {
  const valid: Record<Kind, number> = {
    workspace: src.workspace ? 1 : 0, teams: src.teams ? 1 : 0, users: src.users.length, profiles: src.profiles.length, playbooks: src.playbooks.length,
    approvals: src.approvals.length, kits: src.kits.length, leads: src.leads.length, events: src.events.length, assignments: src.assignments.length,
    audit: src.audit.length, "finder runs": src.runs.length, "finder businesses": src.businesses.length,
  };
  const kinds = new Map<Kind, KindReport>(KINDS.map((k) => [k, { kind: k, found: src.found[k], valid: valid[k], inserted: 0, present: 0, rejected: 0 }]));
  const problems: Problem[] = [...src.problems];
  const clashes: Clash[] = [];
  const notes: string[] = [];
  const k = (kind: Kind) => kinds.get(kind)!;

  const c = await pool.getConnection();
  try {
    try {
      await c.query("SELECT COUNT(*) FROM schema_migrations");
    } catch (e) {
      if (errno(e) === 1146) throw new Error("The database has no tables yet. Run `pnpm db:migrate` first.");
      throw e;
    }
    await c.beginTransaction();

    /** One insert. A duplicate id means "already there"; a value the database refuses is reported and skipped; anything else is a real error. */
    async function put(kind: Kind, where: string, sql: string, params: unknown[]): Promise<boolean> {
      try {
        await c.query(sql, params);
        k(kind).inserted++;
        return true;
      } catch (e) {
        if (errno(e) === 1062) { k(kind).present++; return false; }
        if (DATA_ERRNOS.has(errno(e) ?? 0)) {
          k(kind).rejected++;
          problems.push({ kind, where, message: `the database refused it: ${sqlMessage(e)}` });
          return false;
        }
        throw e;
      }
    }
    const count = async (sql: string, params: unknown[] = []) => Number(((await c.query<RowDataPacket[]>(sql, params))[0][0] as RowDataPacket).n);

    // Workspace and teams: only when the database has none yet.
    if (src.workspace) {
      const w = src.workspace;
      if (await count("SELECT COUNT(*) AS n FROM workspace")) k("workspace").present++;
      else {
        await c.query(`INSERT INTO workspace (id, name, studio, demo_domain, based_line, feature_lead_finder, feature_software_track, rate_cad, rate_aed, outreach_health, updated_at)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [w.name, w.studio, w.demoDomain, w.basedLine, w.features.leadFinder ? 1 : 0, w.features.softwareTrack ? 1 : 0,
          w.markets?.rates.CAD ?? null, w.markets?.rates.AED ?? null, json(w.outreachHealth), toDbTime(new Date().toISOString())]);
        k("workspace").inserted++;
      }
    }
    if (src.teams) {
      if (await count("SELECT COUNT(*) AS n FROM teams")) { k("teams").present++; notes.push("The database already has teams; the teams file was left alone."); }
      else {
        for (const [i, t] of src.teams.teams.entries()) {
          await c.query("INSERT INTO teams (id, name, position) VALUES (?, ?, ?)", [t.id, t.name, i]);
          for (const [j, m] of [...new Set(t.managers)].entries()) await c.query("INSERT INTO team_managers (team_id, username, position) VALUES (?, ?, ?)", [t.id, m, j]);
        }
        k("teams").inserted++;
        notes.push(`${src.teams.teams.length} team${src.teams.teams.length === 1 ? "" : "s"} in the teams file.`);
      }
    }

    for (const u of src.users) {
      await put("users", `team/users/${u.username}.json`,
        `INSERT INTO users (username, full_name, role, team, status, status_reason, suspended_until, temp_password_hash, rev, pw_rev, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.username, u.fullName, u.role, u.team, u.status, u.statusReason, toDbDate(u.suspendedUntil), u.tempPasswordHash, u.rev, u.pwRev, u.createdBy, toDbTime(u.createdAt), toDbTime(u.updatedAt)]);
    }
    for (const p of src.profiles) {
      await put("profiles", `team/data/${p.username}/profile.json`, "INSERT INTO profiles (username, default_device, password_hash, based_on_rev, outreach_health) VALUES (?, ?, ?, ?, ?)",
        [p.username, p.defaultDevice, p.passwordHash, p.basedOnRev, json(p.outreachHealth)]);
    }
    for (const pb of src.playbooks) {
      const have = (await count("SELECT COUNT(*) AS n FROM playbook_reads WHERE username = ?", [pb.username])) + (await count("SELECT COUNT(*) AS n FROM playbook_required WHERE username = ?", [pb.username]));
      if (have) { k("playbooks").present++; continue; }
      try {
        for (const [section, at] of Object.entries(pb.reads)) await c.query("INSERT INTO playbook_reads (username, section_id, read_at) VALUES (?, ?, ?)", [pb.username, section, toDbTime(at)]);
        for (const section of [...new Set(pb.required)]) await c.query("INSERT INTO playbook_required (username, section_id) VALUES (?, ?)", [pb.username, section]);
        k("playbooks").inserted++;
      } catch (e) {
        if (!DATA_ERRNOS.has(errno(e) ?? 0)) throw e;
        k("playbooks").rejected++;
        problems.push({ kind: "playbooks", where: `team/data/${pb.username}/playbook.json`, message: `the database refused it: ${sqlMessage(e)}` });
      }
    }
    for (const a of src.approvals) {
      await put("approvals", `team/data/${a.owner}/approvals.json (${a.id})`, "INSERT INTO approvals (id, owner, kind, file_id, version, approved_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [a.id, a.owner, a.kind, a.fileId, a.version, toDbTime(a.approvedAt), a.note]);
    }
    for (const kit of src.kits) {
      await put("kits", `team/data/${kit.owner}/kits/${kit.id}.json`,
        `INSERT INTO kits (id, owner, title, status, category, device, state, city, city_is_free, direction, site_lang, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [kit.id, kit.owner, kit.title, kit.status, kit.category, kit.device, kit.state, kit.city, kit.city_is_free ? 1 : 0, kit.direction, kit.site_lang ?? null, toDbTime(kit.created_at), toDbTime(kit.updated_at)]);
    }

    // Leads. The earliest lead to hold a duplicate key keeps it; a later one is imported without that key and listed.
    const replaced = new Set(src.leads.filter((l) => l.sourceRef).map((l) => `${l.sourceRef!.owner}/${l.sourceRef!.id}`));
    for (const l of [...src.leads].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))) {
      const where = `team/data/${l.owner}/leads/${l.id}.json`;
      try { fits(l); } catch (e) {
        k("leads").rejected++;
        problems.push({ kind: "leads", where, message: e instanceof StoreError ? e.message : String(e) });
        continue;
      }
      const inserted = await put("leads", where, `INSERT INTO leads (${LEAD_COLS.join(", ")}) VALUES (${LEAD_COLS.map(() => "?").join(", ")})`, leadValues(l));
      if (!inserted) continue;
      const live = !replaced.has(`${l.owner}/${l.id}`);
      for (const key of dupKeys(l)) {
        try {
          await c.query("INSERT INTO lead_keys (lead_id, key_value, live) VALUES (?, ?, ?)", [l.id, dbKey(key), live ? 1 : null]);
        } catch (e) {
          if (errno(e) !== 1062) throw e;
          const [h] = await c.query<RowDataPacket[]>("SELECT l.owner, l.id, l.business_name FROM lead_keys k JOIN leads l ON l.id = k.lead_id WHERE k.key_value = ? AND k.live = 1 LIMIT 1", [dbKey(key)]);
          clashes.push({ type: "lead", record: `${l.owner}/${l.id}`, businessName: l.business_name, matchedOn: KEY_LABEL[key[0] as keyof typeof KEY_LABEL], sameAs: h[0] ? `${h[0].owner}/${h[0].id} (${h[0].business_name})` : "another lead" });
        }
      }
    }

    // Append-only records keep the order they were written in.
    const leadIds = new Set(src.leads.map((l) => `${l.owner}/${l.id}`));
    const orphanEvents = src.events.filter((e) => !leadIds.has(`${e.lead_owner}/${e.lead_id}`)).length;
    if (orphanEvents) notes.push(`${orphanEvents} event${orphanEvents === 1 ? "" : "s"} belong to leads that were deleted; kept, as the app keeps them today.`);
    for (const e of src.events) {
      await put("events", `events ${e.id} (by ${e.by})`, `INSERT INTO lead_events (id, lead_owner, lead_id, by_user, kind, from_stage, to_stage, channel, occurred_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.lead_owner, e.lead_id, e.by, e.kind, e.from_stage, e.to_stage, e.channel, toDbDate(e.occurred_on), e.note, toDbTime(e.created_at)]);
    }
    for (const a of src.assignments) {
      await put("assignments", `assignments ${a.id} (by ${a.by})`, "INSERT INTO assignments (id, kind, by_user, lead_owner, lead_id, business, to_user, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [a.id, a.kind, a.by, a.leadOwner, a.leadId, a.business, a.to, toDbTime(a.at)]);
    }
    for (const a of src.audit) {
      await put("audit", `audit ${a.id} (by ${a.actor})`, "INSERT INTO audit_log (id, at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)",
        [a.id, toDbTime(a.at), a.actor, a.action, a.target, a.detail]);
    }

    for (const r of src.runs) {
      await put("finder runs", `finder run ${r.id} (${r.owner})`,
        `INSERT INTO finder_runs (id, owner, started_at, query, category, city, state, run_limit, finished_at, found, checked, skipped_has_website, skipped_duplicate, saved, stop_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.owner, toDbTime(r.startedAt), r.query, r.category, r.city, r.state, r.limit, r.finishedAt ? toDbTime(r.finishedAt) : null, r.found, r.checked, r.skippedHasWebsite, r.skippedDuplicate, r.saved, r.stopReason]);
    }
    for (const b of [...src.businesses].sort((x, y) => x.scrapedAt.localeCompare(y.scrapedAt) || x.id.localeCompare(y.id))) {
      const inserted = await put("finder businesses", `finder business ${b.id} (${b.owner})`,
        `INSERT INTO finder_businesses (id, owner, place_key, scraped_on, scraped_at, run_id, query, category, city, state, name, phone, address, maps_category, rating, review_count, email,
          facebook_url, instagram_url, other_links, maps_url, has_website, website_url, whatsapp, moved_lead_id, moved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.owner, b.placeKey, b.scrapedOn, toDbTime(b.scrapedAt), b.runId, b.query, b.category, b.city, b.state, b.name, b.phone, b.address, b.mapsCategory, b.rating, b.reviewCount,
          b.email, b.facebookUrl, b.instagramUrl, JSON.stringify(b.otherLinks), b.mapsUrl, b.hasWebsite ? 1 : 0, (b.websiteUrl ?? "").slice(0, 1000), (b.whatsapp ?? "").slice(0, 300), b.movedLeadId, b.movedAt ? toDbTime(b.movedAt) : null]);
      if (!inserted) continue;
      for (const key of new Set(finderKeys(b))) {
        try {
          await c.query("INSERT INTO business_keys (business_id, key_value) VALUES (?, ?)", [b.id, dbKey(key)]);
        } catch (e) {
          if (errno(e) !== 1062) throw e;
          const [h] = await c.query<RowDataPacket[]>("SELECT f.owner, f.id, f.name FROM business_keys k JOIN finder_businesses f ON f.id = k.business_id WHERE k.key_value = ? LIMIT 1", [dbKey(key)]);
          clashes.push({ type: "business", record: `${b.owner}/${b.id}`, businessName: b.name, matchedOn: KEY_LABEL[key[0] as keyof typeof KEY_LABEL], sameAs: h[0] ? `${h[0].owner}/${h[0].id} (${h[0].name})` : "another business" });
        }
      }
    }

    const tableRows: Record<string, number> = {};
    for (const t of TABLES) tableRows[t] = await count(`SELECT COUNT(*) AS n FROM \`${t}\``);

    if (o.apply) await c.commit();
    else await c.rollback();

    const list = [...kinds.values()];
    const reconciled = list.every((r) => r.valid === r.inserted + r.present + r.rejected);
    return { apply: o.apply, kinds: list, problems, clashes, notes, tableRows, reconciled };
  } catch (e) {
    await c.rollback().catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

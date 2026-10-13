// Numbered SQL files in db/migrations/, applied once each, in order, and recorded in schema_migrations.
// A file is never edited after it has run anywhere: a change is a new file.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import type { DbConfig } from "./config";

export const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
const FILE = /^(\d{4})_([a-z0-9_]+)\.sql$/;

export interface MigrationFile { version: number; name: string; file: string; sql: string; checksum: string }

export async function readMigrations(dir = MIGRATIONS_DIR): Promise<MigrationFile[]> {
  const out: MigrationFile[] = [];
  for (const f of (await readdir(dir)).sort()) {
    const m = FILE.exec(f);
    if (!m) continue;
    const sql = await readFile(path.join(dir, f), "utf8");
    out.push({ version: Number(m[1]), name: m[2]!, file: f, sql, checksum: createHash("sha1").update(sql).digest("hex") });
  }
  const seen = new Set<number>();
  for (const m of out) {
    if (seen.has(m.version)) throw new Error(`Two migrations are numbered ${m.version}.`);
    seen.add(m.version);
  }
  return out;
}

/** Applies what hasn't run yet. Returns the file names it applied. Refuses if an applied file has since been edited. */
export async function migrate(config: DbConfig, dir = MIGRATIONS_DIR): Promise<string[]> {
  const conn = await mysql.createConnection({
    host: config.host, port: config.port, user: config.user, password: config.password, database: config.database,
    charset: "utf8mb4", multipleStatements: true, timezone: "Z",
  });
  const applied: string[] = [];
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT NOT NULL PRIMARY KEY, name VARCHAR(120) NOT NULL, checksum CHAR(40) NOT NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [rows] = await conn.query("SELECT version, checksum FROM schema_migrations");
    const done = new Map((rows as { version: number; checksum: string }[]).map((r) => [r.version, r.checksum]));
    for (const m of await readMigrations(dir)) {
      const have = done.get(m.version);
      if (have !== undefined) {
        if (have !== m.checksum) throw new Error(`Migration ${m.file} was changed after it ran. Add a new migration instead of editing it.`);
        continue;
      }
      await conn.query(m.sql);
      await conn.query("INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)", [m.version, m.name, m.checksum]);
      applied.push(m.file);
    }
  } finally {
    await conn.end();
  }
  return applied;
}

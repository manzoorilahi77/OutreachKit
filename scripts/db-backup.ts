// pnpm db:backup [--dir <folder>] [--keep <days>]
// Writes outreachkit-<date>-<time>.sql.gz (a mysqldump of the database in DB_*) into the folder (default ~/backups/outreachkit, mode 0700),
// then deletes our own backups older than --keep days (default 14). The password goes to mysqldump through a private temporary
// options file, never on the command line, and is never printed. Needs the `mysqldump` program (it comes with the MySQL client).
import { spawn } from "node:child_process";
import { chmodSync, createWriteStream, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { dbConfigFromEnv } from "../src/lib/db/config";
import { loadLocalEnv } from "./lib/loadEnv";

loadLocalEnv();
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? (args[i + 1] ?? "") : null; };
const dir = path.resolve(flag("dir") ?? path.join(homedir(), "backups", "outreachkit"));
const keep = Number(flag("keep") ?? 14);
if (!Number.isFinite(keep) || keep < 1) { console.error("--keep is a number of days, 1 or more."); process.exit(1); }

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const file = path.join(dir, `outreachkit-${stamp}.sql.gz`);
const partial = file + ".partial";
const work = mkdtempSync(path.join(tmpdir(), "okit-backup-"));

try {
  const c = dbConfigFromEnv();
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch { /* Windows */ }
  const opts = path.join(work, "client.cnf");
  writeFileSync(opts, `[client]\nuser=${c.user}\npassword="${c.password.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"\nhost=${c.host}\nport=${c.port}\n`, { mode: 0o600 });

  const dump = spawn("mysqldump", [`--defaults-extra-file=${opts}`, "--no-tablespaces", "--set-gtid-purged=OFF", "--default-character-set=utf8mb4", c.database], { stdio: ["ignore", "pipe", "pipe"] });
  let err = "";
  dump.stderr.on("data", (d) => { err += String(d); });
  const exited = new Promise<number>((resolve, reject) => { dump.on("error", reject); dump.on("close", (code) => resolve(code ?? 1)); });
  await Promise.all([pipeline(dump.stdout, createGzip(), createWriteStream(partial, { mode: 0o600 })), exited.then((code) => {
    if (code !== 0) throw new Error(`mysqldump failed (exit ${code}): ${err.trim().split("\n").slice(-2).join(" ")}`);
  })]);
  renameSync(partial, file);
  console.log(`Backup written: ${file} (${statSync(file).size} bytes)`);

  const cutoff = Date.now() - keep * 86_400_000;
  for (const f of readdirSync(dir)) {
    if (!/^outreachkit-\d{8}-\d{6}\.sql\.gz$/.test(f)) continue;
    const p = path.join(dir, f);
    if (statSync(p).mtimeMs < cutoff) { unlinkSync(p); console.log(`Deleted old backup ${f}`); }
  }
} catch (e) {
  rmSync(partial, { force: true });
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}

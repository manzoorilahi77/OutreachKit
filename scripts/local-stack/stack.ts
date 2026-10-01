// pnpm stack up|down|reset|status — a local Supabase-compatible stack without Docker:
//   Postgres (brew postgresql@17) + GoTrue (built from supabase/auth) + PostgREST (brew) + Mailpit (brew)
//   behind a small gateway on :54321 that serves /auth/v1 and /rest/v1, like Supabase's own API gateway.
// Data and logs live in .local-supabase/ (git-ignored). Migrations come from supabase/migrations/.
// This is for development and tests. Production uses a hosted Supabase project.
import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".local-supabase");
const PG_BIN = "/opt/homebrew/opt/postgresql@17/bin";
const PORTS = { pg: 54322, gotrue: 9999, rest: 3000, api: 54321, smtp: 1025, mail: 8025 };
const SECRET_FILE = join(ROOT, "jwt-secret");
const APP_URL = process.env.APP_URL ?? "http://localhost:3100";
const OS_USER = process.env.USER ?? "postgres";

const dirs = { data: join(ROOT, "pgdata"), run: join(ROOT, "run"), logs: join(ROOT, "logs") };
mkdirSync(dirs.run, { recursive: true });
mkdirSync(dirs.logs, { recursive: true });

const sh = (cmd: string, args: string[], env: Record<string, string> = {}) =>
  spawnSync(cmd, args, { env: { ...process.env, ...env }, encoding: "utf8" });

const psqlArgs = (db = "postgres") => ["-h", "localhost", "-p", String(PORTS.pg), "-U", OS_USER, "-d", db, "-v", "ON_ERROR_STOP=1", "-q"];
export const psql = (sql: string, db = "postgres") => sh(`${PG_BIN}/psql`, [...psqlArgs(db), "-c", sql]);
const psqlFile = (file: string) => sh(`${PG_BIN}/psql`, [...psqlArgs(), "-f", file]);

function jwtSecret(): string {
  if (!existsSync(SECRET_FILE)) writeFileSync(SECRET_FILE, randomBytes(24).toString("hex"));
  return readFileSync(SECRET_FILE, "utf8").trim();
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
function signJwt(payload: object, secret: string) {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  return `${head}.${body}.${createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")}`;
}

export function keys() {
  const secret = jwtSecret();
  const claims = { iss: "supabase-local", iat: 1700000000, exp: 4102444800 };
  return {
    secret,
    anon: signJwt({ ...claims, role: "anon" }, secret),
    service: signJwt({ ...claims, role: "service_role" }, secret),
  };
}

function pidFile(name: string) { return join(dirs.run, `${name}.pid`); }
function isRunning(name: string): boolean {
  try { process.kill(Number(readFileSync(pidFile(name), "utf8")), 0); return true; } catch { return false; }
}
function start(name: string, cmd: string, args: string[], env: Record<string, string> = {}) {
  if (isRunning(name)) return;
  const log = join(dirs.logs, `${name}.log`);
  const out = spawn("sh", ["-c", `exec "$0" "$@" >> "${log}" 2>&1`, cmd, ...args], { env: { ...process.env, ...env }, detached: true, stdio: "ignore" });
  out.unref();
  writeFileSync(pidFile(name), String(out.pid));
}
function stop(name: string) {
  try { process.kill(Number(readFileSync(pidFile(name), "utf8"))); } catch {}
  rmSync(pidFile(name), { force: true });
}

async function waitFor(label: string, ok: () => Promise<boolean> | boolean, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if (await ok()) return; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`${label} did not start; see ${dirs.logs}`);
}
const httpOk = (url: string) => async () => (await fetch(url)).status < 500;

function initDb() {
  if (!existsSync(join(dirs.data, "PG_VERSION"))) {
    const r = sh(`${PG_BIN}/initdb`, ["-D", dirs.data, "-U", OS_USER, "--auth=trust", "-E", "UTF8"]);
    if (r.status) throw new Error(r.stderr);
  }
}

function roles() {
  const r = psql(`
    do $$ begin
      if not exists (select from pg_roles where rolname = 'postgres') then create role postgres superuser login; end if;
      if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
      if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
      if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
      if not exists (select from pg_roles where rolname = 'authenticator') then create role authenticator noinherit login password 'postgres'; end if;
      if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin noinherit createrole login password 'postgres'; end if;
    end $$;
    grant anon, authenticated, service_role to authenticator;
    create extension if not exists pgcrypto;
    create extension if not exists "uuid-ossp";
    create schema if not exists auth authorization supabase_auth_admin;
    grant usage on schema auth to anon, authenticated, service_role;
    alter role supabase_auth_admin set search_path = auth, public;
    grant all on schema public to supabase_auth_admin;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  if (r.status) throw new Error(r.stderr);
}

function migrate() {
  psql("create table if not exists public.local_migrations (name text primary key, applied_at timestamptz default now())");
  const dir = resolve("supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    const done = sh(`${PG_BIN}/psql`, [...psqlArgs(), "-t", "-A", "-c", `select 1 from public.local_migrations where name = '${f}'`]).stdout.trim();
    if (done) continue;
    const r = psqlFile(join(dir, f));
    if (r.status) throw new Error(`${f}: ${r.stderr}`);
    psql(`insert into public.local_migrations (name) values ('${f}')`);
    console.log(`applied ${f}`);
  }
  psql("notify pgrst, 'reload schema'");
}

async function up() {
  const k = keys();
  initDb();
  start("postgres", `${PG_BIN}/postgres`, ["-D", dirs.data, "-p", String(PORTS.pg), "-k", "/tmp", "-c", "listen_addresses=localhost"]);
  await waitFor("postgres", () => psql("select 1").status === 0);
  roles();

  start("mailpit", "/opt/homebrew/bin/mailpit", ["--smtp", `localhost:${PORTS.smtp}`, "--listen", `localhost:${PORTS.mail}`, "--database", join(ROOT, "mailpit.db")]);

  const tpl = `http://127.0.0.1:${PORTS.api}/_templates/magic_link.html`; // served by the gateway below
  start("gotrue", resolve(".local-supabase/bin/gotrue"), [], {
    GOTRUE_DB_DRIVER: "postgres",
    DATABASE_URL: `postgres://supabase_auth_admin:postgres@localhost:${PORTS.pg}/postgres?search_path=auth`,
    GOTRUE_API_HOST: "127.0.0.1",
    PORT: String(PORTS.gotrue),
    API_EXTERNAL_URL: `http://localhost:${PORTS.api}/auth/v1`,
    GOTRUE_SITE_URL: APP_URL,
    GOTRUE_URI_ALLOW_LIST: `${APP_URL}/**`,
    GOTRUE_JWT_SECRET: k.secret,
    GOTRUE_JWT_EXP: "3600",
    GOTRUE_JWT_AUD: "authenticated",
    GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated",
    GOTRUE_DISABLE_SIGNUP: "false",
    GOTRUE_EXTERNAL_EMAIL_ENABLED: "true",
    GOTRUE_MAILER_AUTOCONFIRM: "false",
    GOTRUE_SMTP_HOST: "localhost",
    GOTRUE_SMTP_PORT: String(PORTS.smtp),
    GOTRUE_SMTP_ADMIN_EMAIL: "hello@famysys.com",
    GOTRUE_SMTP_SENDER_NAME: "Famysys",
    GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "Your Famysys Outreach Kit sign-in link",
    GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: tpl,
    GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "Your Famysys Outreach Kit sign-in link",
    GOTRUE_MAILER_TEMPLATES_CONFIRMATION: tpl,
    GOTRUE_RATE_LIMIT_EMAIL_SENT: "1000",
    GOTRUE_LOG_LEVEL: "info",
  });
  await waitFor("gotrue", httpOk(`http://127.0.0.1:${PORTS.gotrue}/health`));
  await waitFor("auth schema", () => sh(`${PG_BIN}/psql`, [...psqlArgs(), "-t", "-A", "-c", "select to_regclass('auth.users')"]).stdout.trim() === "auth.users");

  migrate();

  const conf = join(ROOT, "postgrest.conf");
  writeFileSync(conf, [
    `db-uri = "postgres://authenticator:postgres@localhost:${PORTS.pg}/postgres"`,
    `db-schemas = "public"`,
    `db-anon-role = "anon"`,
    `jwt-secret = "${k.secret}"`,
    `server-host = "127.0.0.1"`,
    `server-port = ${PORTS.rest}`,
    ``,
  ].join("\n"));
  start("postgrest", "/opt/homebrew/bin/postgrest", [conf]);
  await waitFor("postgrest", httpOk(`http://127.0.0.1:${PORTS.rest}/`));

  start("gateway", process.execPath, [resolve("scripts/local-stack/gateway.mjs")], { GATEWAY_PORT: String(PORTS.api), GOTRUE_PORT: String(PORTS.gotrue), REST_PORT: String(PORTS.rest) });
  await waitFor("gateway", httpOk(`http://127.0.0.1:${PORTS.api}/auth/v1/health`));

  writeFileSync(".env.local", [
    `NEXT_PUBLIC_SUPABASE_URL=http://localhost:${PORTS.api}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${k.anon}`,
    `# Used only by tests and the local stack. The app never reads it.`,
    `SUPABASE_SERVICE_ROLE_KEY=${k.service}`,
    `SUPABASE_DB_URL=postgres://${OS_USER}@localhost:${PORTS.pg}/postgres`,
    `MAILPIT_URL=http://localhost:${PORTS.mail}`,
    ``,
  ].join("\n"));
  console.log(`Local Supabase is up. API http://localhost:${PORTS.api}, mail http://localhost:${PORTS.mail}. Keys written to .env.local.`);
}

function down() {
  for (const n of ["gateway", "postgrest", "gotrue", "mailpit"]) stop(n);
  if (isRunning("postgres")) sh(`${PG_BIN}/pg_ctl`, ["-D", dirs.data, "stop", "-m", "fast"]);
  rmSync(pidFile("postgres"), { force: true });
  console.log("Local Supabase stopped.");
}

const cmd = process.argv[2];
if (cmd === "up") await up();
else if (cmd === "down") down();
else if (cmd === "reset") {
  down();
  await new Promise((r) => setTimeout(r, 1000));
  rmSync(dirs.data, { recursive: true, force: true });
  rmSync(join(ROOT, "mailpit.db"), { force: true });
  await up();
} else if (cmd === "status") {
  for (const n of ["postgres", "gotrue", "postgrest", "mailpit", "gateway"]) console.log(`${n}: ${isRunning(n) ? "running" : "stopped"}`);
} else console.log("usage: pnpm stack up|down|reset|status");

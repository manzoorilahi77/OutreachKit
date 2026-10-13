// pnpm db:init-owner: the owner runs this once, on an empty database (after `pnpm db:migrate`). It asks for the workspace and the
// owner's own login, then creates them. Flags skip the questions: --workspace --studio --domain --username --name, and the password
// from OKIT_OWNER_PASSWORD. It never prints a password.
import { createInterface } from "node:readline/promises";
import { hashPassword, generateTempPassword, passwordProblem } from "../src/lib/auth/password";
import { dbConfigFromEnv } from "../src/lib/db/config";
import { getPool } from "../src/lib/db/pool";
import { hasSuperAdminDb, initWorkspaceDb } from "../src/lib/store/mysqlBootstrap";
import { usernameProblem } from "../src/lib/store/paths";
import { loadLocalEnv } from "./lib/loadEnv";
import { askHidden } from "./lib/prompt";

loadLocalEnv();
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? (args[i + 1] ?? "") : null; };

let pool;
try {
  dbConfigFromEnv();
  pool = getPool();
  if (await hasSuperAdminDb(pool)) {
    console.error("The database already has a super admin, so this has already been run. Nothing was changed.");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e, "\nIf the tables are missing, run `pnpm db:migrate` first.");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
async function ask(label: string, given: string | null, check?: (v: string) => string | null): Promise<string> {
  for (;;) {
    const v = (given ?? (await rl.question(`${label}: `))).trim();
    const problem = !v ? "This can't be empty." : check?.(v) ?? null;
    if (!problem) return v;
    if (given !== null) { console.error(problem); process.exit(1); }
    console.log(problem);
  }
}

console.log("Set up the Famysys Outreach Kit workspace. This runs once, on the server.\n");
const workspaceName = await ask("Workspace name (for example Famysys)", flag("workspace"));
const studio = await ask("Studio or brand used in every kit", flag("studio"));
const demoDomain = await ask("Demo domain (for example famysys.com)", flag("domain"));
const username = (await ask("Your username (3 to 30 characters: letters, digits, dot, underscore)", flag("username"), (v) => usernameProblem(v.toLowerCase()))).toLowerCase();
const fullName = await ask("Your full name", flag("name"));

let password = process.env.OKIT_OWNER_PASSWORD ?? "";
if (password) {
  const p = passwordProblem(password, username);
  if (p) { console.error(p); process.exit(1); }
} else {
  for (;;) {
    password = await askHidden(rl, "Choose your password (10 or more characters)");
    const p = passwordProblem(password, username);
    if (p) { console.log(p); continue; }
    if ((await askHidden(rl, "Type it again")) !== password) { console.log("They don't match. Try again."); continue; }
    break;
  }
}
rl.close();

await initWorkspaceDb(pool, {
  workspaceName, studio, demoDomain, username, fullName,
  passwordHash: await hashPassword(password),
  unusableTempHash: await hashPassword(generateTempPassword() + generateTempPassword()),
});
await pool.end();

console.log(`\nDone. Created the workspace and your account (${username}).`);
console.log("\nNext:");
console.log("  1. Start the app (pnpm start, or pm2 on the server) and sign in with the password you just chose.");
console.log("  2. Users → Create user for each teammate. Copy their username and temporary password to them.");
console.log("  3. Import your earlier leads with pnpm db:import-team (dry run first), or Leads → Import CSV.");

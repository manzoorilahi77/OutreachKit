// pnpm db:reset-password <username>
// For when a password is lost and the app can't help: nobody can reset the super admin from the app, and nobody may be able to sign in at all.
// Run on the server (or your computer) with the database settings in .env.local. It asks for the new password twice, without showing it,
// sets it as the person's own (no forced change), signs them out everywhere, lifts a sign-in lock and writes an audit line.
// For OKIT_NEW_PASSWORD (scripted use) the password comes from that one environment variable. It never prints a password.
import { createInterface } from "node:readline/promises";
import { hashPassword, passwordProblem } from "../src/lib/auth/password";
import { dbConfigFromEnv } from "../src/lib/db/config";
import { getPool } from "../src/lib/db/pool";
import { setPasswordAsOperator } from "../src/lib/store/mysqlBootstrap";
import { usernameProblem } from "../src/lib/store/paths";
import { loadLocalEnv } from "./lib/loadEnv";
import { askHidden } from "./lib/prompt";

loadLocalEnv();
const username = (process.argv[2] ?? "").trim().toLowerCase();
if (!username || usernameProblem(username)) {
  console.error("Usage: pnpm db:reset-password <username>\n  Example: pnpm db:reset-password super.admin");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
let pool: ReturnType<typeof getPool> | null = null;
try {
  dbConfigFromEnv();
  pool = getPool();
  let password = process.env.OKIT_NEW_PASSWORD ?? "";
  if (password) {
    const p = passwordProblem(password, username);
    if (p) throw new Error(p);
  } else {
    for (;;) {
      password = await askHidden(rl, `New password for ${username} (10 or more characters)`);
      const p = passwordProblem(password, username);
      if (p) { console.log(p); continue; }
      if ((await askHidden(rl, "Type it again")) !== password) { console.log("They don't match. Try again."); continue; }
      break;
    }
  }
  await setPasswordAsOperator(pool, username, await hashPassword(password));
  console.log(`Done. ${username} can sign in with the new password now; any open session of theirs has ended.`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool?.end();
}

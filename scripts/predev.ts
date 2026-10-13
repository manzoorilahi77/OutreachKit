// Runs before `pnpm dev` (pnpm's predev hook). Node only: the same on Mac and Windows.
//   1. load .env.local and apply any database migrations that haven't run yet (if the database is configured)
//   2. `pnpm secrets:check`
// Nothing here touches the network except the database named in .env.local.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbConfigFromEnv, hasDbConfig } from "../src/lib/db/config";
import { migrate } from "../src/lib/db/migrate";
import { loadLocalEnv } from "./lib/loadEnv";

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv();

if (hasDbConfig()) {
  try {
    const applied = await migrate(dbConfigFromEnv());
    if (applied.length) console.log(`predev: applied ${applied.length} database migration${applied.length === 1 ? "" : "s"}.`);
  } catch (e) {
    console.error(`predev: the database isn't reachable or a migration failed: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
} else {
  console.log("predev: DB_HOST, DB_USER, DB_PASSWORD and DB_NAME aren't set, so the app can't start. Copy .env.example to .env.local and fill them in.");
}

try {
  execFileSync(process.execPath, [path.join(here, "node_modules", "tsx", "dist", "cli.mjs"), path.join(here, "scripts", "secrets-check.ts")], { cwd: here, stdio: "inherit" });
} catch {
  process.exit(1);
}

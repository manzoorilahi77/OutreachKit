// pnpm db:migrate: applies db/migrations/*.sql that haven't run yet. Safe to run again.
import { dbConfigFromEnv } from "../src/lib/db/config";
import { migrate } from "../src/lib/db/migrate";
import { loadLocalEnv } from "./lib/loadEnv";

loadLocalEnv();
try {
  const config = dbConfigFromEnv();
  const applied = await migrate(config);
  console.log(applied.length ? `Applied ${applied.length} migration${applied.length === 1 ? "" : "s"} to ${config.database}:\n  ${applied.join("\n  ")}` : `${config.database} is up to date.`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

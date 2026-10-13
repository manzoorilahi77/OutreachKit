// pnpm db:import-team [--from <folder that holds team/>] [--apply]
// Copies team/ into the MySQL database in DB_* (.env.local). A dry run is the default: it does everything inside a transaction,
// prints what it would do, and rolls back. --apply commits. It only ever READS team/. Run `pnpm db:migrate` first.
import path from "node:path";
import { dbConfigFromEnv } from "../src/lib/db/config";
import { createPool } from "../src/lib/db/pool";
import { importTeam } from "../src/lib/store/teamImport";
import { readTeamSource } from "../src/lib/store/teamSource";
import { loadLocalEnv } from "./lib/loadEnv";

loadLocalEnv();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fromAt = args.indexOf("--from");
const from = path.resolve(fromAt >= 0 ? (args[fromAt + 1] ?? "") : process.cwd());
if (fromAt >= 0 && !args[fromAt + 1]) { console.error("--from needs a folder (the one that contains team/)."); process.exit(1); }

const pad = (s: string | number, n: number, right = false) => (right ? String(s).padStart(n) : String(s).padEnd(n));

try {
  const config = dbConfigFromEnv();
  const src = await readTeamSource(from);
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${path.join(from, "team")} -> database ${config.database} on ${config.host}:${config.port}`);
  const pool = createPool(config, 2);
  let report;
  try { report = await importTeam(pool, src, { apply }); } finally { await pool.end(); }

  console.log(`\n${pad("", 20)}${pad("in files", 10, true)}${pad("usable", 8, true)}${pad("inserted", 10, true)}${pad("present", 9, true)}${pad("refused", 9, true)}  check`);
  for (const r of report.kinds) {
    const ok = r.valid === r.inserted + r.present + r.rejected;
    console.log(`${pad(r.kind, 20)}${pad(r.found, 10, true)}${pad(r.valid, 8, true)}${pad(r.inserted, 10, true)}${pad(r.present, 9, true)}${pad(r.rejected, 9, true)}  ${ok ? "ok" : "MISMATCH"}${r.found !== r.valid ? `  (${r.found - r.valid} unusable, see below)` : ""}`);
  }
  console.log("\nRows in the database after this import" + (apply ? ":" : " (what --apply would leave):"));
  console.log("  " + Object.entries(report.tableRows).map(([t, n]) => `${t} ${n}`).join(" · "));
  for (const n of report.notes) console.log(`note: ${n}`);

  if (report.problems.length) {
    console.log(`\nNeed a look (${report.problems.length}), never dropped quietly:`);
    for (const p of report.problems) console.log(`  [${p.kind}] ${p.where}: ${p.message}`);
  }
  if (report.clashes.length) {
    console.log(`\nDuplicate businesses (${report.clashes.length}). The record is imported but not guarded on the shared key; merge or delete one in the app:`);
    for (const c of report.clashes) console.log(`  ${c.type} ${c.record} "${c.businessName}" shares its ${c.matchedOn} with ${c.sameAs}`);
  }
  console.log(`\n${report.reconciled ? "Counts reconcile." : "COUNTS DO NOT RECONCILE."} ${apply ? "Committed." : "Dry run: nothing was written. Run again with --apply to write."}`);
  process.exit(report.reconciled ? 0 : 1);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

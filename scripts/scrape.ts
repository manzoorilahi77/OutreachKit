// pnpm scrape "<category>" "<city>" <ST> --as <username> --limit 50 [--headed]
// Finds businesses on Google Maps that show no website and saves them to that person's finder list in the database.
import { isRegion } from "../src/lib/market/regions";
import { createStore } from "../src/lib/store";
import { loadLocalEnv } from "./lib/loadEnv";
import { StoreError } from "../src/lib/store/errors";
import { DEFAULT_LIMIT } from "../src/lib/scrape/limits";
import { runScrape } from "../src/lib/scrape/scraper";
import { progressLine } from "../src/lib/scrape/types";

loadLocalEnv();
const usage = `Usage: pnpm scrape "<category>" "<city>" <ST> --as <username> [--limit ${DEFAULT_LIMIT}] [--headed]
  Example: pnpm scrape "Roofers" "Dallas" TX --as ravi --limit 5`;

const args = process.argv.slice(2);
/** Removes `--name value` from args and returns the value ("" when the value is missing), or null when the flag is absent. */
function take(name: string): string | null {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1] ?? "";
  args.splice(i, 2);
  return v;
}
const headed = args.includes("--headed");
if (headed) args.splice(args.indexOf("--headed"), 1);
const limitArg = take("--limit");
const as = take("--as");
const [category, city, stRaw] = args;
const st = (stRaw ?? "").toUpperCase();
const limit = limitArg === null ? DEFAULT_LIMIT : Number(limitArg);

if (!category || !city || !isRegion(st) || args.length !== 3 || !Number.isInteger(limit) || limit < 1 || limit > 500) {
  console.error(usage);
  process.exit(1);
}
const user = as ? await createStore(null).getUser(as.toLowerCase()) : null;
if (!user || user.status !== "active") {
  console.error(as ? `No active account called "${as}".` : "Say who is running it: --as <username>.");
  process.exit(1);
}
const finder = createStore({ username: user.username, role: user.role, team: user.team }).finder();

const ac = new AbortController();
process.on("SIGINT", () => {
  console.log("\nStopping after the current step…");
  ac.abort();
});

try {
  const r = await runScrape({
    finder, category, city, state: st, limit, headed, signal: ac.signal,
    onEvent(e) {
      if (e.type === "status") console.log(e.message);
      else if (e.type === "saved") console.log(`  + ${e.business.name}${e.business.phone ? " · " + e.business.phone : ""}`);
      else if (e.type === "progress") process.stdout.write(`\r${e.message} · saved today ${e.savedToday} of ${e.limit}   `);
    },
  });
  console.log(`\n\nRun ${r.runId}: ${progressLine(r)}`);
  console.log(`Found ${r.found} listings. Saved today: ${r.savedToday} of ${limit}.`);
  console.log(`Stopped: ${r.stopReason}`);
  process.exit(["captcha", "consent", "blocked", "error"].includes(r.stopCode) ? 2 : 0);
} catch (e) {
  console.error(e instanceof StoreError ? e.message : e instanceof Error ? e.message : e);
  process.exit(1);
}

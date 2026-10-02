// pnpm kits:check: validates the category kits in src/kits. Prints `file → rule → offending text`
// for every failure, then one summary line per file, and exits non-zero on any failure.
// Warnings (generic lines within the allowance, a family combo no direction uses) are printed but never fail.
import { checkKits, summaryLine } from "./lib/kits";

const { problems, warnings, reports } = checkKits();

for (const w of warnings) console.log(`  warn  ${w.file} → ${w.rule} → ${w.text}`);
for (const p of problems) console.error(`${p.file} → ${p.rule} → ${p.text}`);
if (warnings.length || problems.length) console.log("");
for (const r of reports) console.log(summaryLine(r));
console.log(`\n${reports.length} kit file${reports.length === 1 ? "" : "s"}, ${problems.length} failure${problems.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`);
if (problems.length) process.exit(1);

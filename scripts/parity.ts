// pnpm parity: parses docs/source/territory-desk.html and checks everything extracted from it.
//  1. Every constant in src/data is deep-equal to the one the original's own JavaScript builds.
//  2. The counts are derived from the source (the expected figures in the brief are only a sanity check).
//  3. Sections 01-11, masthead, footer, board columns and console copy in src/content equal the original's
//     static prose, after the logged corrections (scripts/lib/corrections.ts) and the naming swaps.
// Writes docs/parity-report.md and exits non-zero on any mismatch.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import vm from "node:vm";
import * as data from "../src/data";
import { SECTIONS } from "../src/content/sections";
import { MASTHEAD } from "../src/content/masthead";
import { FOOTER } from "../src/content/footer";
import { BOARD_CONTENT } from "../src/content/board";
import { CONSOLE_CONTENT } from "../src/content/console";
import { applyPatches } from "./lib/corrections";
import { CONST_NAMES, SOURCE_PATH, extractFunction, loadConstants, readSource, scriptText } from "./lib/source";
import { withStaticPage } from "./lib/staticdom";
import { walkDocument } from "./lib/walker";

const html = readSource();
const sha = createHash("sha256").update(html).digest("hex");
const original = JSON.parse(JSON.stringify(loadConstants())) as ReturnType<typeof loadConstants>; // plain objects: vm values carry another realm's prototypes
const failures: string[] = [];

function firstDiff(a: unknown, b: unknown, path = "$"): string | null {
  if (isDeepStrictEqual(a, b)) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: length ${a.length} vs ${b.length}`;
    for (let i = 0; i < a.length; i++) { const d = firstDiff(a[i], b[i], `${path}[${i}]`); if (d) return d; }
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join() !== kb.join()) return `${path}: keys differ`;
    for (const k of ka) { const d = firstDiff((a as never)[k], (b as never)[k], `${path}.${k}`); if (d) return d; }
  }
  return `${path}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`;
}

const count = (v: unknown) => (Array.isArray(v) ? v.length : Object.keys(v as object).length);

// ---- 1 + 2: constants ----
const rows: string[] = [];
for (const n of CONST_NAMES) {
  const src = original[n];
  const repo = (data as Record<string, unknown>)[n];
  const diff = firstDiff(src, repo);
  const ok = diff === null;
  if (!ok) failures.push(`${n}: ${diff}`);
  rows.push(`| ${n} | ${count(src)} | ${count(repo)} | ${ok ? "match" : "MISMATCH"} |`);
}

// ---- generator counts, derived by running the original's own functions ----
function generatorCounts() {
  const src = scriptText(html);
  const ctx = vm.createContext({});
  const num = new Proxy({}, { get: () => 1 });
  vm.runInContext(["money", "slug", "openers", "messages"].map((f) => (f === "slug" ? "const slug=s=>s.toLowerCase().replace(/[^a-z0-9]/g,\"\");" : extractFunction(src, f))).join("\n"), ctx);
  const X = { city: "C", st: "TX", stName: "Texas", cat: "K", catL: "k", tkt: "$1", q0: "q", fam: "out", arch: {}, famPitch: "p", famBp: ["b"], tone: "t", nearby: "n", price: num, pricedBecause: "x", demo: "https://d.com/c/{business-name}", you: "Y", brand: "B", demoPattern: "pat" };
  ctx.X = X;
  return {
    openers: vm.runInContext("openers(X).length", ctx) as number,
    messages: vm.runInContext("messages(X).length", ctx) as number,
  };
}
const gen = generatorCounts();

const EXPECTED: [string, number, number][] = [
  ["categories (BOARD)", 124, count(original.BOARD)],
  ["families (FAM)", 13, count(original.FAM)],
  ["states incl. DC (STATES)", 51, count(original.STATES)],
  ["site archetypes (ARCH)", 9, count(original.ARCH)],
  ["archetype overrides (ARCHOVER)", 32, count(original.ARCHOVER)],
  ["openers", 15, gen.openers],
  ["messages", 8, gen.messages],
  ["upsells (OPPS)", 31, count(original.OPPS)],
  ["cross-sells (CROSS)", 12, count(original.CROSS)],
  ["AI upsells (AIUP)", 20, count(original.AIUP)],
  ["AI cross-sells (AICROSS)", 12, count(original.AICROSS)],
  ["scorer checks (CHECKS)", 10, count(original.CHECKS)],
  ["sheet columns (COLS)", 28, count(original.COLS)],
];
const countRows = EXPECTED.map(([label, expected, got]) => `| ${label} | ${expected} | ${got} | ${expected === got ? "as briefed" : "DIFFERS FROM BRIEF"} |`);

// ---- 3: prose ----
const walked = await withStaticPage((page) => page.evaluate(walkDocument));
const expectedProse = applyPatches({
  masthead: walked.masthead,
  sections: walked.sections,
  footer: walked.footer,
  board: walked.board,
  console: walked.console,
});
const repoProse = JSON.parse(
  JSON.stringify({ masthead: MASTHEAD, sections: SECTIONS, footer: FOOTER, board: BOARD_CONTENT, console: CONSOLE_CONTENT }),
);
const proseRows: string[] = [];
const compare = (label: string, a: unknown, b: unknown) => {
  const d = firstDiff(a, b);
  if (d) failures.push(`content ${label}: ${d}`);
  proseRows.push(`| ${label} | ${d ? "MISMATCH" : "match"} |`);
};
compare("masthead", expectedProse.masthead, repoProse.masthead);
expectedProse.sections.forEach((s: { id: string; num: string; title: string }, i: number) =>
  compare(`section ${s.num} ${s.title}`, s, repoProse.sections[i]),
);
compare("footer", expectedProse.footer, repoProse.footer);
compare("board columns", expectedProse.board, repoProse.board);
compare("console copy", expectedProse.console, repoProse.console);
if (repoProse.sections.length !== expectedProse.sections.length) failures.push("section count differs");

const report = `# Parity report

Source: \`${SOURCE_PATH}\` (sha256 \`${sha}\`)

Result: **${failures.length ? "FAILED" : "PASSED"}**

## Constants (src/data vs the original's own JavaScript)

| Constant | Count in source | Count in src/data | Deep equal |
|---|---|---|---|
${rows.join("\n")}

## Counts derived from the source vs the brief

| Item | Brief | Source | |
|---|---|---|---|
${countRows.join("\n")}

## Prose (src/content vs the original's static markup)

| Content | |
|---|---|
${proseRows.join("\n")}

${failures.length ? "## Failures\n\n" + failures.map((f) => `- ${f}`).join("\n") + "\n" : ""}`;
writeFileSync("docs/parity-report.md", report);
console.log(report);
if (failures.length || EXPECTED.some(([, e, g]) => e !== g)) {
  console.error(failures.length ? `\n${failures.length} parity failure(s).` : "\nCounts differ from the brief.");
  process.exit(1);
}

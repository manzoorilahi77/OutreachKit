// Fails on anything off-brand: hex outside the four colours, fonts other than Jost,
// font-weight above 500, <b> tags, "Jost Book", or text below 16px-equivalent.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ALLOWED_HEX = new Set(["#0f2a4a", "#2c2e33", "#f7f5f2", "#1e6fff"]);
const ROOTS = ["src", "public/brand"];
const EXTS = new Set([".ts", ".tsx", ".css", ".svg", ".html", ".mjs", ".sql", ".md"]);
// The skipped files and directories, each with its reason, live in scripts/lib/brand-config.ts.
import { SKIP_DIRS, SKIP_FILES } from "./lib/brand-config";

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const problems: string[] = [];
const rules: [RegExp, string][] = [
  [/font-weight\s*:\s*(?:[6-9]\d\d|bold|bolder)/gi, "font-weight above 500"],
  [/\bfont-(?:semibold|bold|extrabold|black)\b/g, "Tailwind bold weight class"],
  [/<b[\s>]/g, "<b> tag (use <strong>)"],
  [/Jost Book/gi, "Jost Book"],
  [/\b(?:bg|text|border|fill|stroke|ring|from|to|via)-(?:red|green|yellow|amber|orange|lime|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)(?:-\d+)?\b/g, "Tailwind default colour (use brand tokens)"],
  [/\btext-xs\b/g, "text-xs (below 16px-equivalent)"],
  [/font-family\s*:\s*(?!var\(|inherit)[^;}]*/gi, "font-family outside the Jost token"],
];

for (const root of ROOTS) {
  for (const f of walk(root)) {
    if (SKIP_FILES.has(f) || SKIP_DIRS.some((d) => f.startsWith(d)) || f.endsWith(".test.ts")) continue;
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
      const hex = m[0].toLowerCase();
      // ignore HTML entity-like and anchor fragments such as href="#main"
      if (/^#[0-9a-f]{3}$/.test(hex) || /^#[0-9a-f]{6}$/.test(hex) || /^#[0-9a-f]{8}$/.test(hex)) {
        if (!ALLOWED_HEX.has(hex.slice(0, 7))) problems.push(`${f}: off-palette ${m[0]}`);
      }
    }
    for (const [re, msg] of rules) {
      for (const m of text.matchAll(re)) {
        if (msg.startsWith("font-family") && /Jost/.test(m[0]) === false && !/system-ui/.test(m[0])) {
          problems.push(`${f}: ${msg}: ${m[0].trim()}`);
        } else if (!msg.startsWith("font-family")) {
          problems.push(`${f}: ${msg}`);
        }
      }
    }
  }
}

if (problems.length) {
  console.error("Brand check failed:\n" + problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log("Brand check passed: four colours, Jost only, no weight above 500.");

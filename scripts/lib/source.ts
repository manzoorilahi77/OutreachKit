// Reads docs/source/territory-desk.html and pulls named constants out of its scripts.
// Constants are found by a bracket-aware scan and evaluated in an empty vm context,
// so the values are exactly what the original's own JavaScript produces.
import { readFileSync } from "node:fs";
import vm from "node:vm";

export const SOURCE_PATH = "docs/source/territory-desk.html";

export const CONST_NAMES = [
  "STATES", "FAM", "BOARD", "TONE", "STYLE", "ARCH", "ARCHFAM", "ARCHOVER",
  "AIUP", "AICROSS", "TPL", "BASECOMP", "OPPS", "CROSS", "CHECKS", "COLS", "W", "NOUN",
] as const;
export type ConstName = (typeof CONST_NAMES)[number];

export function readSource(): string {
  return readFileSync(SOURCE_PATH, "utf8");
}

export function scriptText(html = readSource()): string {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
}

/** Text of the expression after `const NAME=` up to its closing `;`. */
export function extractExpression(src: string, name: string): string {
  const m = new RegExp(`\\bconst ${name}\\s*=`).exec(src);
  if (!m) throw new Error(`const ${name} not found in source`);
  return scanToSemicolon(src, m.index + m[0].length);
}

/** Full text of `function NAME(...){...}`. */
export function extractFunction(src: string, name: string): string {
  const m = new RegExp(`\\bfunction ${name}\\s*\\(`).exec(src);
  if (!m) throw new Error(`function ${name} not found in source`);
  const i = src.indexOf("{", m.index);
  const start = m.index;
  const end = scanBalanced(src, i);
  return src.slice(start, end + 1);
}

function skipLiteral(src: string, i: number): number | null {
  const c = src[i];
  if (c === '"' || c === "'") {
    for (i++; i < src.length; i++) {
      if (src[i] === "\\") i++;
      else if (src[i] === c) return i;
    }
  } else if (c === "`") {
    for (i++; i < src.length; i++) {
      if (src[i] === "\\") i++;
      else if (src[i] === "$" && src[i + 1] === "{") i = scanBalanced(src, i + 1);
      else if (src[i] === "`") return i;
    }
  } else if (c === "/" && src[i + 1] === "/") {
    while (i < src.length && src[i] !== "\n") i++;
    return i;
  } else if (c === "/" && src[i + 1] === "*") {
    return src.indexOf("*/", i) + 1;
  }
  return null;
}

/** Index of the bracket that closes the one at `open`. */
function scanBalanced(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const skip = skipLiteral(src, i);
    if (skip !== null) { i = skip; continue; }
    const c = src[i];
    if ("([{".includes(c!)) depth++;
    else if (")]}".includes(c!) && --depth === 0) return i;
  }
  throw new Error("unbalanced source");
}

function scanToSemicolon(src: string, from: number): string {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const skip = skipLiteral(src, i);
    if (skip !== null) { i = skip; continue; }
    const c = src[i]!;
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === ";" && depth === 0) return src.slice(from, i);
  }
  throw new Error("no terminating semicolon");
}

export function loadConstants(): Record<ConstName, unknown> {
  const src = scriptText();
  const ctx = vm.createContext({});
  const out = {} as Record<ConstName, unknown>;
  for (const n of CONST_NAMES) out[n] = vm.runInContext(`(${extractExpression(src, n)})`, ctx);
  return out;
}

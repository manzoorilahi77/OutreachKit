// Writes src/data/*.ts from the constants in docs/source/territory-desk.html.
// Run: pnpm extract:data. The generated files are not edited by hand; pnpm parity re-checks them.
import { mkdirSync, writeFileSync } from "node:fs";
import { CONST_NAMES, loadConstants, type ConstName } from "./lib/source";
import { q, ser } from "./lib/ser";

const HEADER =
  "// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.\n" +
  "// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.\n\n";

type Spec = { file: string; imports: string[]; type: string; pre?: (v: unknown) => string };
const SPECS: Record<ConstName, Spec> = {
  STATES: {
    file: "states", imports: ["StateEntry"], type: "Record<StateCode, StateEntry>",
    pre: (v) => `export type StateCode = ${Object.keys(v as object).map(q).join(" | ")};\n`,
  },
  FAM: { file: "fam", imports: ["FamKey", "Family"], type: "Record<FamKey, Family>" },
  BOARD: { file: "board", imports: ["BoardRow"], type: "BoardRow[]" },
  TONE: { file: "tone", imports: ["FamKey"], type: "Record<FamKey, string>" },
  STYLE: { file: "style", imports: ["FamKey", "StyleEntry"], type: "Record<FamKey, StyleEntry>" },
  ARCH: { file: "arch", imports: ["ArchKey", "Archetype"], type: "Record<ArchKey, Archetype>" },
  ARCHFAM: { file: "archfam", imports: ["ArchKey", "FamKey"], type: "Record<FamKey, ArchKey>" },
  ARCHOVER: { file: "archover", imports: ["ArchKey"], type: "Record<string, ArchKey>" },
  AIUP: { file: "aiup", imports: ["UpsellRow"], type: "UpsellRow[]" },
  AICROSS: { file: "aicross", imports: ["CrossRow"], type: "CrossRow[]" },
  TPL: { file: "tpl", imports: ["Template"], type: "Template" },
  BASECOMP: { file: "basecomp", imports: [], type: "Record<string, string>" },
  OPPS: { file: "opps", imports: ["UpsellRow"], type: "UpsellRow[]" },
  CROSS: { file: "cross", imports: ["CrossRow"], type: "CrossRow[]" },
  CHECKS: { file: "checks", imports: ["CheckRow"], type: "CheckRow[]" },
  COLS: { file: "cols", imports: [], type: "string[]" },
  W: { file: "weights", imports: [], type: "number[]" },
  NOUN: { file: "noun", imports: ["FamKey"], type: "Record<FamKey, string>" },
};

mkdirSync("src/data", { recursive: true });
const values = loadConstants();
const barrel: string[] = [];
for (const name of CONST_NAMES) {
  const s = SPECS[name];
  const imp = s.imports.length ? `import type { ${s.imports.join(", ")} } from "./types";\n\n` : "";
  const body = `${s.pre ? s.pre(values[name]) : ""}export const ${name}: ${s.type} = ${ser(values[name], "")};\n`;
  writeFileSync(`src/data/${s.file}.ts`, HEADER + imp + body);
  barrel.push(`export { ${name}${name === "STATES" ? ", type StateCode" : ""} } from "./${s.file}";`);
}
writeFileSync("src/data/index.ts", "export * from \"./types\";\n" + barrel.join("\n") + "\n");
console.log(`Wrote ${CONST_NAMES.length} data files to src/data/`);

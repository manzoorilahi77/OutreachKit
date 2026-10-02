// pnpm themes:sync: copies the base-website template's theme system into src/themes, verbatim.
// The build prompt sends every demo to that template, so its 50 combos (C1–C50) are the only
// palettes a design direction may choose. Nothing here edits a value; it only adds a provenance header.
// BASE_WEBSITE_DIR overrides the default checkout path.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = process.env.BASE_WEBSITE_DIR || "/Users/manzoor/Documents/Manzoor Personal/BaseProjects/base-website";
const FILES = ["library.ts", "contrast.ts"];
const OUT = "src/themes";

let commit: string;
try {
  commit = execFileSync("git", ["-C", DIR, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  console.error(`themes:sync: ${DIR} is not a git checkout of base-website. Set BASE_WEBSITE_DIR.`);
  process.exit(1);
}
const dirty = execFileSync("git", ["-C", DIR, "status", "--porcelain", "src/themes"], { encoding: "utf8" }).trim();

mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  const src = readFileSync(join(DIR, "src/themes", f), "utf8");
  const header =
    `// Vendored from manzoorilahi77/base-website src/themes/${f} at commit ${commit}${dirty ? " (with uncommitted changes)" : ""}.\n` +
    `// Do not edit by hand: run \`pnpm themes:sync\`. Everything below this header is a verbatim copy.\n`;
  writeFileSync(join(OUT, f), header + src);
  console.log(`themes:sync: ${OUT}/${f} ← ${commit.slice(0, 7)}`);
}

// Writes src/content/*.ts (structured prose for sections 01-11, masthead, footer, console).
// Run once to port the prose; after that the content files are maintained by hand (the three
// corrections are applied to them in Phase 6) and `pnpm parity` compares them to the original.
import { writeFileSync } from "node:fs";
import { ser } from "./lib/ser";
import { withStaticPage } from "./lib/staticdom";
import { walkDocument } from "./lib/walker";

const HEADER =
  "// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;\n" +
  "// `pnpm parity` compares it to the original, allowing only the logged corrections.\n\n";

const doc = await withStaticPage((page) => page.evaluate(walkDocument));

const slugs: Record<string, string> = {
  math: "01-math", choose: "02-choose", board: "03-board", kitsec: "04-kit", filter: "05-filter",
  sell: "06-sell", site: "07-site", device: "08-device", track: "09-track", reach: "10-reach", ninety: "11-ninety",
};
const names: Record<string, string> = {
  math: "math", choose: "choose", board: "board", kitsec: "kit", filter: "filter",
  sell: "sell", site: "site", device: "device", track: "track", reach: "reach", ninety: "ninety",
};

const idx: string[] = [];
const list: string[] = [];
for (const s of doc.sections) {
  const file = slugs[s.id as string]!;
  const n = names[s.id as string]!;
  writeFileSync(`src/content/sections/${file}.ts`, `${HEADER}import type { Section } from "../types";\n\nexport const ${n}: Section = ${ser(s, "")};\n`);
  idx.push(`import { ${n} } from "./${file}";`);
  list.push(n);
}
writeFileSync("src/content/sections/index.ts", `${idx.join("\n")}\nimport type { Section } from "../types";\n\nexport const SECTIONS: Section[] = [${list.join(", ")}];\n`);
writeFileSync("src/content/masthead.ts", `${HEADER}import type { Masthead } from "./types";\n\nexport const MASTHEAD: Masthead = ${ser(doc.masthead, "")};\n`);
writeFileSync("src/content/footer.ts", `${HEADER}import type { Inline } from "./types";\n\nexport const FOOTER: Inline[][] = ${ser(doc.footer, "")};\n`);
writeFileSync("src/content/board.ts", `${HEADER}import type { BoardContent } from "./types";\n\nexport const BOARD_CONTENT: BoardContent = ${ser(doc.board, "")};\n`);
writeFileSync("src/content/console.ts", `${HEADER}import type { ConsoleContent } from "./types";\n\nexport const CONSOLE_CONTENT: ConsoleContent = ${ser(doc.console, "")};\n`);
console.log(`Wrote ${doc.sections.length} sections, masthead, footer, board and console content.`);

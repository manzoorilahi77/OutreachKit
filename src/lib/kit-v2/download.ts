// The "Download kit (.md)" file. Generated on the client, never sent anywhere. Prompt C (the Cowork
// prospecting task) parses it, so the front-matter keys and the headings are fixed; tests/download.test.ts
// snapshots them.
import { CHECKS } from "@/data";
import type { Block, Inline } from "@/content/types";
import { SECTIONS } from "@/content/sections";
import { slug } from "@/lib/kit/helpers";
import { inlineText } from "@/lib/kit/text";
import type { Kit, KitContext, KitNode } from "@/lib/kit/types";
import type { CategoryKit, DirectionId } from "./types";
import { kitSlug } from "./types";
import { CURRENCY_OF } from "@/lib/market/currency";
import { countryOf } from "@/lib/market/regions";

export interface DownloadMeta {
  X: KitContext;
  marketLabel: string;
  ck: CategoryKit | null;
  dir: DirectionId;
  generatedAt: string;
}

export const DOWNLOAD_HEADINGS = {
  filtering: "## Filtering signals",
  checks: "## Scorer checks",
  openers: "## Openers",
  sequence: "## Sequence",
  pricing: "## Pricing",
  ladder: "## Upsell ladder",
} as const;

export function downloadName(X: KitContext): string {
  return `fieldkit_${kitSlug(X.cat)}_${kitSlug(X.city) || slug(X.city)}.md`;
}

const yaml = (v: string) => JSON.stringify(v);
const nodesOf = (kit: Kit, id: string): KitNode[] => kit.sections.find((s) => s.id === id)?.nodes ?? [];
const cellText = (inline: Inline[]) => inlineText(inline).replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Pass one and pass two of section 05, as plain lists. */
function filteringSignals(): string[] {
  const out: string[] = [];
  const section = SECTIONS.find((s) => s.id === "filter")!;
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.type === "h4" || b.type === "h3") out.push("", "### " + inlineText(b.inline));
      else if (b.type === "list") out.push(...b.items.map((i) => "- " + inlineText(i)));
      else if (b.type === "ticks") out.push(...b.items.map((i) => "- " + inlineText(i.inline)));
      else if (b.type === "cards") b.cards.forEach(walk);
      else if (b.type === "card") walk(b.blocks);
    }
  };
  walk(section.blocks);
  return out;
}

export function kitMarkdown(kit: Kit, m: DownloadMeta): string {
  const { X, ck } = m;
  const L: string[] = [
    "---",
    "category: " + yaml(X.cat),
    "slug: " + yaml(kitSlug(X.cat)),
    "city: " + yaml(X.city),
    "state: " + yaml(X.st),
    // Outside the US only, so a US file is byte-for-byte what Prompt C already parses.
    ...(countryOf(X.st) !== "US" ? ["country: " + yaml(countryOf(X.st)), "currency: " + yaml(CURRENCY_OF[countryOf(X.st)])] : []),
    ...(kit.input.lang ? ["siteLanguage: " + yaml(kit.input.lang)] : []),
    "marketLabel: " + yaml(m.marketLabel),
    "device: " + yaml(kit.input.device),
    "demoPattern: " + yaml(X.demoPattern),
    "direction: " + yaml(ck ? m.dir : ""),
    "contentSource: " + yaml(ck ? "category" : "generic"),
    "reviewStatus: " + yaml(ck ? ck.provenance.reviewStatus : "generic"),
    "generatedAt: " + yaml(m.generatedAt),
    "---",
    "",
    "# Field kit: " + kit.header.title,
    "",
    kit.header.note,
    "",
    DOWNLOAD_HEADINGS.filtering,
    ...filteringSignals(),
    "",
    DOWNLOAD_HEADINGS.checks,
    "",
    ...CHECKS.map((c, i) => `${i + 1}. **${c[0]}** — ${c[1]}`),
    "",
    DOWNLOAD_HEADINGS.openers,
  ];

  for (const n of nodesOf(kit, "openers"))
    if (n.k === "openers")
      n.items.forEach((o, i) => L.push("", `### ${String(i + 1).padStart(2, "0")} · ${o[0]}`, "", "- Angle: " + o[0], "- Line: " + o[1], "- Hook: " + o[2], "- Link line: " + o[3]));

  L.push("", DOWNLOAD_HEADINGS.sequence);
  for (const n of nodesOf(kit, "sequence")) if (n.k === "copyBlock") L.push("", "### " + n.label, "", "```text", n.text, "```");

  L.push("", DOWNLOAD_HEADINGS.pricing, "");
  for (const n of nodesOf(kit, "pricing"))
    if (n.k === "table") {
      L.push("| " + n.head.join(" | ") + " |", "|" + n.head.map(() => " --- ").join("|") + "|");
      for (const r of n.rows) L.push("| " + r.map((c) => cellText(c.inline)).join(" | ") + " |");
    }

  L.push("", DOWNLOAD_HEADINGS.ladder, "");
  for (const n of nodesOf(kit, "ladder")) {
    if (n.k === "ladder") n.rungs.forEach((r) => L.push(`${r.rung}. Day ${r.day} — ${r.offer} (${r.price}). Pitch when: ${r.trigger} Line: ${r.line}`));
    if (n.k === "table") n.rows.forEach((r, i) => L.push(`${i + 1}. ${r.map((c) => cellText(c.inline)).join(" · ")}`));
  }
  return L.join("\n") + "\n";
}

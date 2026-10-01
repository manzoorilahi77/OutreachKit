// Flattens a Kit to text in document order, the same way an element's textContent reads.
// The golden tests compare this with the original page's #kit textContent, section by section.
import type { Inline } from "@/content/types";
import type { Kit, KitNode } from "./types";

/** Button and label text the kit shows around its content. */
export const CHROME = {
  copy: "Copy",
  openerCopy: "Copy DM line",
  openerCopyLink: "Line + link (for reply or email)",
  hook: "Hook",
  linkLine: "Link line",
} as const;

export function inlineText(parts: Inline[]): string {
  return parts
    .map((p) => {
      if (typeof p === "string") return p;
      if ("strong" in p) return inlineText(p.strong);
      if ("em" in p) return inlineText(p.em);
      if ("mono" in p) return p.mono;
      if ("chip" in p) return p.chip.text;
      return inlineText(p.link.children);
    })
    .join("");
}

export function nodeText(n: KitNode): string {
  switch (n.k) {
    case "h4":
    case "p":
      return inlineText(n.inline);
    case "chips":
      return n.items.join("");
    case "steps":
      return n.items.map((i) => i.n + inlineText(i.inline)).join("");
    case "list":
      return n.items.map(inlineText).join("");
    case "pairs":
      return n.items.map((i) => i.dt + inlineText(i.dd)).join("");
    case "copyBlock":
      return n.label + CHROME.copy + n.text;
    case "openers":
      return n.items
        .map((o, i) => String(i + 1).padStart(2, "0") + o[0] + CHROME.openerCopy + CHROME.openerCopyLink + o[1] + CHROME.hook + o[2] + CHROME.linkLine + o[3])
        .join("");
    case "table":
      return n.head.join("") + n.rows.map((r) => r.map((c) => inlineText(c.inline)).join("")).join("");
    case "timeline":
      return n.items.map((i) => i.join("")).join("");
    case "ups":
      return n.items.map((i) => i.name + i.price + i.why).join("");
  }
}

export interface KitText {
  header: string;
  sections: string[];
  clips: string[];
}

export function kitText(kit: Kit): KitText {
  const clips: string[] = [];
  for (const s of kit.sections)
    for (const n of s.nodes) {
      if (n.k === "copyBlock") clips.push(n.text);
      if (n.k === "openers") for (const o of n.items) clips.push(o[1], o[1] + "\n\n" + o[3]);
    }
  return {
    header: kit.header.title + kit.header.chips.map((c) => c.text).join("") + kit.header.note,
    sections: kit.sections.map((s) => s.nodes.map(nodeText).join("")),
    clips,
  };
}

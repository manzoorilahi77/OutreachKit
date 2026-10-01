import { isDeepStrictEqual } from "node:util";

// The logged content changes. Parity applies these to the original's prose before comparing it with src/content,
// so the only allowed differences between the original and the app are listed here (and in CHANGES.md).
//  - NAMING: the app is "Famysys Outreach Kit", not "The Territory Desk". Not a content correction.
//  - CORRECTIONS: the three corrections from the brief.
export interface Patch {
  location: string;
  old: string;
  new: string;
  /** Which of the three corrections this belongs to. */
  correction?: 1 | 2 | 3;
  /** How many text nodes the patch is expected to change (default 1). */
  count?: number;
}

export const NAMING: Patch[] = [
  { location: "masthead title", old: "The Territory Desk", new: "Famysys Outreach Kit" },
  { location: "console bar", old: "Territory Desk — Kit Console", new: "Kit Console" },
];

export const CORRECTIONS: Patch[] = [
  // 1. Cold reply rate is 1–5%, not 12–20%
  {
    correction: 1, location: "Section 01, funnel line",
    old: "→ 12–18 replies → 5–7 calls → 2–3 closes. Every number",
    new: "→ 1–5 replies → 0.4–2.5 calls → 0.1–0.8 closes (planning estimates). Every number",
  },
  { correction: 1, location: "Section 09, ratio table: Contacted → Replied", old: "12 – 20%", new: "1 – 5%" },
  {
    correction: 1, location: "Section 11, Weeks 3–6",
    old: "Send every single one a demo screenshot. Expect roughly 25–35 replies and 8–12 calls across the period.",
    new: "Send every single one a text-only first message, then the demo screenshot once they reply. Expect roughly 2–10 replies and 1–5 calls across the period (planning estimates).",
  },
  // 2. The first DM is text only
  {
    correction: 2, location: "Section 10, contact sequence, Day 0",
    old: "one sentence on what you noticed missing, the demo screenshot, one question.",
    new: "one sentence on what you noticed missing, one question. Text only: no screenshot, image or attachment.",
  },
  // 3. Spec demos use placeholders, not the prospect's photos, until written permission
  {
    correction: 3, location: "Section 10, demo-first method, step 1",
    old: " using their real name, real photos from their Instagram or Google profile, and their real service area. Ninety minutes with a template.",
    new: " using their real name and their real service area, with clearly marked placeholders where their photos would go. Ninety minutes with a template.",
  },
  {
    correction: 3, location: "Section 10, note under the method",
    old: "Use only images they published publicly, and take the demo down if they ask.",
    new: "Never use their photos without their written permission, and take the demo down if they ask.",
  },
  {
    correction: 3, location: "Section 11, Weeks 2–3",
    old: "Two spec demos for real local businesses. This is",
    new: "Two spec demos for real local businesses, with clearly marked placeholders in place of their photos until they give written permission. This is",
  },
];

/** A change that spans more than one text node: the whole value matching `old` is replaced by `new`. */
export interface StructPatch { correction: 1 | 2 | 3; location: string; old: unknown; new: unknown }

export const STRUCT_CORRECTIONS: StructPatch[] = [
  {
    correction: 2, location: "Section 10, demo-first method, step 4",
    old: [
      "Send the screenshot as the ",
      { em: ["first"] },
      " message. You are no longer asking for their time; you are showing them something that already exists with their name on it.",
    ],
    new: [
      "Send a text-only first message: no screenshot, image or attachment. Once they reply, send the screenshot and the link. You are no longer asking for their time; you are showing them something that already exists with their name on it.",
    ],
  },
];

/** Replaces exact string occurrences inside a JSON-like value. Each patch must apply the expected number of times. */
export function applyPatches<T>(value: T, patches: Patch[] = [...NAMING, ...CORRECTIONS], structs: StructPatch[] = STRUCT_CORRECTIONS): T {
  const hits = new Map<Patch | StructPatch, number>();
  const walk = (v: unknown): unknown => {
    for (const sp of structs) if (isDeepStrictEqual(v, sp.old)) { hits.set(sp, (hits.get(sp) ?? 0) + 1); return sp.new; }
    if (typeof v === "string") {
      let s = v;
      for (const p of patches) if (s.includes(p.old)) { s = s.split(p.old).join(p.new); hits.set(p, (hits.get(p) ?? 0) + 1); }
      return s;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const out = walk(value) as T;
  for (const sp of structs) if (hits.get(sp) !== 1) throw new Error(`Patch "${sp.location}" applied ${hits.get(sp) ?? 0} time(s), expected 1`);
  for (const p of patches) {
    const got = hits.get(p) ?? 0;
    if (got !== (p.count ?? 1)) throw new Error(`Patch "${p.location}" applied ${got} time(s), expected ${p.count ?? 1}`);
  }
  return out;
}

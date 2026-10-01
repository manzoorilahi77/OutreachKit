// The logged content changes. Parity applies these to the original's prose before comparing it with src/content,
// so the only allowed differences between the original and the app are listed here.
//  - NAMING: the app is "Famysys Outreach Kit", not "The Territory Desk". Not a content correction.
//  - CORRECTIONS: the three corrections from the brief (filled in during Phase 6; see CHANGES.md).
export interface Patch { location: string; old: string; new: string }

export const NAMING: Patch[] = [
  { location: "masthead title", old: "The Territory Desk", new: "Famysys Outreach Kit" },
  { location: "console bar", old: "Territory Desk — Kit Console", new: "Kit Console" },
];

export const CORRECTIONS: Patch[] = [];

/** Replaces exact string occurrences inside a JSON-like value. Each patch must apply at least once. */
export function applyPatches<T>(value: T, patches: Patch[] = [...NAMING, ...CORRECTIONS]): T {
  const hits = new Map<Patch, number>();
  const walk = (v: unknown): unknown => {
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
  for (const p of patches) if (!hits.has(p)) throw new Error(`Patch never applied: ${p.location}`);
  return out;
}

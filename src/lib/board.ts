import { FAM } from "@/data";
import type { FamKey } from "@/data";
import { CATS } from "@/lib/kit/categories";
import type { Category } from "@/lib/kit/types";

export type SortKey = "name" | "fam" | "tkt" | "price" | "gap" | "score" | "tier";
export type Sort = { k: SortKey; dir: 1 | -1 };

export const DEFAULT_SORT: Sort = { k: "score", dir: -1 };

const keyOf: Record<SortKey, (c: Category) => string | number> = {
  name: (c) => c.n,
  fam: (c) => FAM[c.f].l,
  tkt: (c) => c.d[0]!,
  price: (c) => c.price,
  gap: (c) => c.d[1]!,
  score: (c) => c.idx,
  tier: (c) => c.tier,
};

/** Filter then sort the board exactly as the original does. */
export function boardRows(fam: "all" | FamKey, tier: "all" | "A" | "B" | "C", sort: Sort): Category[] {
  const rows = CATS.filter((c) => (fam === "all" || c.f === fam) && (tier === "all" || c.tier === tier));
  const key = keyOf[sort.k];
  return rows.sort((a, b) => {
    const x = key(a), y = key(b);
    return (typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y))) * sort.dir;
  });
}

/** Clicking the active column flips direction; a new column starts ascending for text, descending for numbers. */
export function nextSort(cur: Sort, k: SortKey): Sort {
  if (cur.k === k) return { k, dir: cur.dir === 1 ? -1 : 1 };
  return { k, dir: k === "name" || k === "fam" || k === "price" ? 1 : -1 };
}

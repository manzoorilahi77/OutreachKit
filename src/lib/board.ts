import { catalogFor, groupLabel } from "@/lib/kit/categories";
import type { GroupKey, Size } from "@/lib/kit/extBoard";
import type { Category } from "@/lib/kit/types";
import { DEFAULT_COUNTRY, type Country } from "@/lib/market/regions";

export type SortKey = "name" | "fam" | "tkt" | "price" | "gap" | "score" | "tier";
export type Sort = { k: SortKey; dir: 1 | -1 };

export const DEFAULT_SORT: Sort = { k: "score", dir: -1 };

/** Lowest number in a price range, so "$12,000–30,000" sorts above "$3,000–5,000". */
const priceLo = (p: string) => Number(p.match(/[\d,]+/)?.[0]?.replace(/,/g, "") ?? 0);

const keyOf: Record<SortKey, (c: Category) => string | number> = {
  name: (c) => c.n,
  fam: (c) => groupLabel(c.group),
  tkt: (c) => c.d[0]!,
  price: (c) => priceLo(c.price),
  gap: (c) => c.d[1]!,
  score: (c) => c.idx,
  tier: (c) => c.tier,
};

export interface BoardScope { size: Size; country: Country }
export const DEFAULT_SCOPE: BoardScope = { size: "small", country: DEFAULT_COUNTRY };

/** The categories for a size and a country (anything that sells there), filtered by family and tier, then sorted. */
export function boardRows(fam: "all" | GroupKey, tier: "all" | "A" | "B" | "C", sort: Sort, scope: BoardScope = DEFAULT_SCOPE): Category[] {
  const rows = catalogFor(scope.size, scope.country).filter((c) => (fam === "all" || c.group === fam) && (tier === "all" || c.tier === tier));
  const key = keyOf[sort.k];
  return rows.sort((a, b) => {
    const x = key(a), y = key(b);
    return (typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y))) * sort.dir;
  });
}

/** Clicking the active column flips direction; a new column starts ascending for text, descending for numbers. */
export function nextSort(cur: Sort, k: SortKey): Sort {
  if (cur.k === k) return { k, dir: cur.dir === 1 ? -1 : 1 };
  return { k, dir: k === "name" || k === "fam" ? 1 : -1 };
}

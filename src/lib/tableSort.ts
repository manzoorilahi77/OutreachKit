// Sorting and paging for the lead tables. Pure, so it is tested without a browser.

export type SortValue = string | number | null;
export type SortDir = "asc" | "desc";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** A stable sort. Empty values (null or "") always go last, in either direction. Text compares naturally ("Lead 2" before "Lead 10"). */
export function sortRows<T>(rows: readonly T[], value: ((r: T) => SortValue) | undefined, dir: SortDir): T[] {
  if (!value) return [...rows];
  const sign = dir === "asc" ? 1 : -1;
  const empty = (v: SortValue) => v === null || v === "";
  return rows
    .map((r, i) => ({ r, i, v: value(r) }))
    .sort((a, b) => {
      if (empty(a.v) || empty(b.v)) return empty(a.v) && empty(b.v) ? a.i - b.i : empty(a.v) ? 1 : -1;
      const c = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : collator.compare(String(a.v), String(b.v));
      return c !== 0 ? sign * c : a.i - b.i;
    })
    .map((x) => x.r);
}

export interface Page<T> { rows: T[]; page: number; pages: number; from: number; to: number; total: number }

/** `page` is 1-based and is clamped into range. `from` and `to` are 1-based row numbers (0 and 0 when empty). */
export function paginate<T>(rows: readonly T[], page: number, size: number): Page<T> {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (p - 1) * size;
  const slice = rows.slice(start, start + size);
  return { rows: slice, page: p, pages, from: total ? start + 1 : 0, to: total ? start + slice.length : 0, total };
}

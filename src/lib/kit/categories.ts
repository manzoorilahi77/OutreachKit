import { BOARD, FAM, W } from "@/data";
import type { Country } from "@/lib/market/regions";
import { EXT_BOARD, EXT_GROUPS, HEALTH_REGROUP, PORT_FIT, type Fit, type GroupKey, type Size } from "./extBoard";
import type { Category } from "./types";

const score = (digits: string) => {
  const d = digits.split("").map(Number);
  const raw = d.reduce((a, v, j) => a + v * (W[j] ?? 0), 0);
  const idx = Math.round((raw / 50) * 100);
  return { d, idx, tier: (idx >= 80 ? "A" : idx >= 66 ? "B" : "C") as Category["tier"] };
};

/** The board rows with the seven-factor score and tier derived, exactly as the original's CATS. Every one is a small business. */
export const CATS: Category[] = BOARD.map((r, i) => {
  const fit = PORT_FIT[r[0]] ?? {};
  return {
    i, n: r[0], f: r[1], tkt: r[2], price: r[3], gap: r[4], ...score(r[5]),
    note: r[6], q: r[7].split("|"), t: r[8].split("|"), lic: !!r[9],
    size: "small",
    group: HEALTH_REGROUP.has(r[0]) ? "health" : r[1],
    fit: { US: "fits", CA: fit.CA ?? "fits", AE: fit.AE ?? "fits" },
  };
});

/** The healthcare and mid-size categories beyond the port. Indexes continue after the board's. */
export const EXT_CATS: Category[] = EXT_BOARD.map((r, k) => ({
  i: BOARD.length + k, n: r.n, f: r.f, tkt: r.tkt, price: r.price, gap: r.gap, ...score(r.digits),
  note: r.note, q: r.q.split("|"), t: r.t.split("|"), lic: !!r.lic,
  size: r.size, group: r.group, ext: true, fit: r.fit,
  ...(r.arch ? { arch: r.arch } : {}), ...(r.care ? { care: r.care } : {}), ...(r.smallOf ? { smallOf: r.smallOf } : {}),
}));

/** Every category the app offers: the port's board, then the catalogue's. */
export const ALL_CATS: Category[] = [...CATS, ...EXT_CATS];

/** Port categories first, so a port name always resolves to the port's row. */
export function findCategory(name: string): Category | undefined {
  return CATS.find((c) => c.n === name) ?? EXT_CATS.find((c) => c.n === name);
}

export const groupLabel = (g: GroupKey): string => EXT_GROUPS[g] ?? FAM[g as keyof typeof FAM]?.l ?? g;

/** Groups in board order, healthcare after personal care. */
export const GROUP_KEYS: GroupKey[] = (() => {
  const keys = Object.keys(FAM) as GroupKey[];
  const at = keys.indexOf("care") + 1;
  return [...keys.slice(0, at), "health", ...keys.slice(at)];
})();

export const sizeOfCategory = (name: string): Size | null => findCategory(name)?.size ?? null;

export const fitIn = (c: Category, country: Country): Fit => c.fit[country];

/** The categories offered for a size and a country: anything that sells there. */
export function catalogFor(size: Size | "all", country: Country): Category[] {
  return ALL_CATS.filter((c) => (size === "all" || c.size === size) && c.fit[country] !== "no");
}

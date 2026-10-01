import { BOARD, W } from "@/data";
import type { Category } from "./types";

/** The board rows with the seven-factor score and tier derived, exactly as the original's CATS. */
export const CATS: Category[] = BOARD.map((r, i) => {
  const d = r[5].split("").map(Number);
  const raw = d.reduce((a, v, j) => a + v * (W[j] ?? 0), 0);
  const idx = Math.round((raw / 50) * 100);
  return {
    i, n: r[0], f: r[1], tkt: r[2], price: r[3], gap: r[4], d, idx,
    tier: idx >= 80 ? "A" : idx >= 66 ? "B" : "C",
    note: r[6], q: r[7].split("|"), t: r[8].split("|"), lic: !!r[9],
  };
});

export function findCategory(name: string): Category | undefined {
  return CATS.find((c) => c.n === name);
}

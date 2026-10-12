// The numbers behind the ratios chart: the playbook's target band from its table text, a sensible axis, and where the live value sits.
import type { Inline } from "@/content/types";

export function inlineText(parts: Inline[]): string {
  return parts.map((p) => (typeof p === "string" ? p : "strong" in p ? inlineText(p.strong) : "em" in p ? inlineText(p.em) : "mono" in p ? p.mono : "chip" in p ? p.chip.text : inlineText(p.link.children))).join("");
}

/** "35 — 45%" -> { lo: 35, hi: 45 }. Null when the text isn't a range. */
export function parseTarget(text: string): { lo: number; hi: number } | null {
  const m = /(\d+(?:\.\d+)?)\D+?(\d+(?:\.\d+)?)/.exec(text);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  return hi >= lo ? { lo, hi } : null;
}

const STEPS = [5, 10, 20, 25, 50, 75, 100];

/** The axis end (in percent): room above the band and the live value, rounded up to a round number, at most 100. */
export function axisMax(hi: number, livePct: number | null): number {
  const need = Math.max(hi * 1.5, livePct === null ? 0 : livePct * 1.15);
  return STEPS.find((s) => s >= need) ?? 100;
}

export type Standing = "below" | "inside" | "above";

export function standing(livePct: number, band: { lo: number; hi: number }): Standing {
  return livePct < band.lo ? "below" : livePct > band.hi ? "above" : "inside";
}

export const clampPct = (v: number, max: number) => Math.min(100, Math.max(0, (v / max) * 100));

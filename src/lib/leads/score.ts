import { CHECKS } from "@/data";

export type Verdict = "hot" | "warm" | "skip";

export const VERDICT_LABEL: Record<Verdict, string> = {
  hot: "Hot — build the demo",
  warm: "Warm — queue it",
  skip: "Skip",
};

/** Number of ticked checks out of the ten on the 30-second scorer. */
export function scoreOf(checks: readonly boolean[]): number {
  return checks.slice(0, CHECKS.length).filter(Boolean).length;
}

/** Hot 8–10, Warm 5–7, Skip under 5 (section 05). */
export function verdictOf(score: number): Verdict {
  return score >= 8 ? "hot" : score >= 5 ? "warm" : "skip";
}

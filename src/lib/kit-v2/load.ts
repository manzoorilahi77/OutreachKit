import { kitSlug } from "./types";
import type { CategoryKit, ReviewStatus } from "./types";

/**
 * The category kit for a board category, or null when its file doesn't exist yet (a normal state while
 * Prompt A's batch is still running). The template-literal import makes the bundler emit one chunk per
 * file, so a category's content is only downloaded when that category is built. Works on the client
 * (the console) and on the server (/kits/[id]).
 */
export async function loadCategoryKit(catName: string): Promise<CategoryKit | null> {
  const slug = kitSlug(catName);
  if (!slug) return null;
  try {
    const mod = (await import(`../../kits/${slug}.json`)) as { default: CategoryKit };
    const ck = mod.default;
    return ck && ck.category === catName ? ck : null;
  } catch {
    return null;
  }
}

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  "spot-checked": "Spot-checked",
  approved: "Approved",
};

/** The header chip text: which content layer the kit carries, and how far it has been reviewed. */
export function contentChip(ck: CategoryKit | null): string {
  return ck ? "Category kit · " + REVIEW_LABEL[ck.provenance.reviewStatus] : "Generic kit";
}

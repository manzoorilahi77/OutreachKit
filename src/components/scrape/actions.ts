"use server";

import { revalidatePath } from "next/cache";
import { checkPerm } from "@/lib/auth/server";
import { addBusinessToLeads, type MoveResult } from "@/lib/scrape/addToLeads";

export type { MoveResult };

/**
 * "Add to leads" for a saved business that has no lead yet (saved before the finder made leads itself, or refused when the run
 * tried). The finder run makes leads on its own; this is the manual fallback.
 */
export async function moveToLeads(businessId: string, today?: string): Promise<MoveResult> {
  const c = await checkPerm("finder.run");
  if (!c.ok) return { ok: false, message: c.message };
  const result = await addBusinessToLeads(c.store, businessId, today);
  if (result.ok) revalidatePath("/leads");
  return result;
}

"use server";

import { revalidatePath } from "next/cache";
import { checkPerm } from "@/lib/auth/server";
import { parseLeadForm } from "@/lib/leads/form";
import { localDay } from "@/lib/scrape/limits";
import { businessToLeadForm } from "@/lib/scrape/leadMap";
import { StoreError } from "@/lib/store/errors";

export type MoveResult = { ok: true; leadId: string } | { ok: false; message: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Copies one saved business into the signed-in person's leads, then marks it as moved.
 * The fields go through parseLeadForm, the same validation as createLead in src/app/leads/actions.ts, and the duplicate
 * block applies: a business that is already someone's lead is refused with the holder's name.
 */
export async function moveToLeads(businessId: string, today?: string): Promise<MoveResult> {
  const c = await checkPerm("finder.run");
  if (!c.ok) return { ok: false, message: c.message };
  if (typeof businessId !== "string" || !businessId) return { ok: false, message: "That business wasn't found." };

  const finder = c.store.finder();
  const business = await finder.getBusiness(businessId);
  if (!business) return { ok: false, message: "That business wasn't found." };
  if (business.movedLeadId) return { ok: false, message: "That business is already in your leads." };

  const parsed = parseLeadForm(businessToLeadForm(business, typeof today === "string" && ISO.test(today) ? today : localDay()));
  if (!parsed.ok) return { ok: false, message: parsed.error };

  let lead;
  try {
    lead = await c.store.createLead(parsed.value);
  } catch (e) {
    return { ok: false, message: e instanceof StoreError ? e.message : "We couldn't save the lead. Try again." };
  }
  if (!(await finder.markMoved(businessId, lead.id))) {
    // Someone moved it a moment ago: do not leave a second copy behind.
    await c.store.deleteLead(lead.id);
    return { ok: false, message: "That business was already moved. Nothing was added." };
  }
  revalidatePath("/leads");
  return { ok: true, leadId: lead.id };
}

// Copies one saved finder business into the acting person's leads and marks it as moved. Used by the finder run (right after each
// save) and by the "Add to leads" button. The fields go through parseLeadForm, the same validation as createLead in
// src/app/leads/actions.ts, and the duplicate block applies: a business that is already someone's lead is refused with the holder's name.
import { parseLeadForm } from "@/lib/leads/form";
import { StoreError } from "@/lib/store/errors";
import type { Store } from "@/lib/store/store";
import { localDay } from "./limits";
import { businessToLeadForm } from "./leadMap";

export type MoveResult = { ok: true; leadId: string } | { ok: false; message: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function addBusinessToLeads(store: Store, businessId: string, today?: string): Promise<MoveResult> {
  if (typeof businessId !== "string" || !businessId) return { ok: false, message: "That business wasn't found." };

  const finder = store.finder();
  const business = await finder.getBusiness(businessId);
  if (!business) return { ok: false, message: "That business wasn't found." };
  if (business.movedLeadId) return { ok: false, message: "That business is already in your leads." };

  const parsed = parseLeadForm(businessToLeadForm(business, typeof today === "string" && ISO.test(today) ? today : localDay()));
  if (!parsed.ok) return { ok: false, message: parsed.error };

  let lead;
  try {
    lead = await store.createLead(parsed.value);
  } catch (e) {
    return { ok: false, message: e instanceof StoreError ? e.message : "We couldn't save the lead. Try again." };
  }
  if (!(await finder.markMoved(businessId, lead.id))) {
    // Someone moved it a moment ago: do not leave a second copy behind.
    await store.deleteLead(lead.id);
    return { ok: false, message: "That business was already moved. Nothing was added." };
  }
  return { ok: true, leadId: lead.id };
}

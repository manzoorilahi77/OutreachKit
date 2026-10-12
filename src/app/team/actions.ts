"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { checkPerm } from "@/lib/auth/server";
import { StoreError } from "@/lib/store/errors";

/** Assign (from the queue) or hand over (a leaver's leads): one assignment record per lead, in the caller's own folder. */
export async function assignLeads(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("leads.assign");
  if (!c.ok) return { ok: false, message: c.message };
  const to = String(fd.get("to") ?? "");
  const kind = fd.get("kind") === "handover" ? "handover" : "assign";
  const picked = fd.getAll("lead").map(String).filter((v) => /^[^/]+\/[0-9a-f-]{36}$/.test(v));
  if (!to) return { ok: false, message: "Choose a BD to take the leads." };
  if (!picked.length) return { ok: false, message: "Tick at least one lead." };
  let done = 0;
  let first = "";
  for (const v of picked) {
    const [owner, id] = v.split("/") as [string, string];
    try {
      await c.store.assignLead(owner, id, to, kind);
      done++;
    } catch (e) {
      first ||= e instanceof StoreError ? e.message : "One lead couldn't be assigned.";
    }
  }
  revalidatePath("/", "layout");
  if (!done) return { ok: false, message: first };
  return { ok: true, message: `${done} lead${done === 1 ? "" : "s"} assigned. Sync, and they show as “Assigned to you” on that BD's Today page.${first ? ` ${picked.length - done} could not be assigned: ${first}` : ""}` };
}

export async function acceptAssignment(assignmentId: string): Promise<FormState> {
  const c = await checkPerm("leads.edit");
  if (!c.ok) return { ok: false, message: c.message };
  try {
    await c.store.acceptAssignment(assignmentId);
  } catch (e) {
    return { ok: false, message: e instanceof StoreError ? e.message : "We couldn't accept the lead. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Accepted. The lead is in your leads." };
}

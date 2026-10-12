"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { limitOf } from "@/lib/auth/permissions";
import { checkPerm } from "@/lib/auth/server";
import { parseLeadForm } from "@/lib/leads/form";
import { previewImport, type ImportPreview } from "@/lib/leads/import";
import type { Channel, Stage } from "@/lib/leads/stages";
import { FLOW_RANK } from "@/lib/leads/stages";
import { StoreError } from "@/lib/store/errors";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** The rep's local date comes from their browser; fall back to the server's date. */
const dayOf = (v: unknown) => (typeof v === "string" && ISO.test(v) ? v : new Date().toISOString().slice(0, 10));
const say = (e: unknown, fallback: string) => (e instanceof StoreError ? e.message : fallback);

export async function createLead(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("leads.add");
  if (!c.ok) return { ok: false, message: c.message };
  const parsed = parseLeadForm(fd);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  let id: string;
  try {
    id = (await c.store.createLead({ ...parsed.value, kit_id: String(fd.get("kit_id") ?? "") || null })).id;
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the lead. Try again.") };
  }
  revalidatePath("/leads");
  redirect(`/leads/${id}`);
}

export async function updateLead(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("leads.edit");
  if (!c.ok) return { ok: false, message: c.message };
  const id = String(fd.get("id") ?? "");
  const parsed = parseLeadForm(fd);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  try {
    await c.store.updateLead(id, parsed.value);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the lead. Try again.") };
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Saved." };
}

export async function moveStage(id: string, to: Stage, today?: string): Promise<FormState> {
  const c = await checkPerm("leads.edit");
  if (!c.ok) return { ok: false, message: c.message };
  try {
    await c.store.moveStage(id, to, dayOf(today));
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't move the lead. Try again.") };
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Moved." };
}

export async function logTouch(id: string, channel: Channel, today?: string): Promise<FormState> {
  const c = await checkPerm("leads.edit");
  if (!c.ok) return { ok: false, message: c.message };
  try {
    await c.store.logTouch(id, channel, dayOf(today));
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't log the touch. Try again.") };
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Logged." };
}

export async function deleteLead(fd: FormData) {
  const c = await checkPerm("leads.edit");
  const id = String(fd.get("id") ?? "");
  if (!c.ok || !id) return;
  try { await c.store.deleteLead(id); } catch { return; }
  revalidatePath("/leads");
  redirect("/leads");
}

export async function addComment(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("leads.comment");
  if (!c.ok) return { ok: false, message: c.message };
  const owner = String(fd.get("owner") ?? "");
  const id = String(fd.get("id") ?? "");
  try {
    await c.store.addComment(owner, id, String(fd.get("note") ?? ""), dayOf(fd.get("today")));
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the comment. Try again.") };
  }
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Comment added." };
}

// ---- CSV import (/leads/import). Reads only the text the rep uploads.
const MAX_CSV_BYTES = 1_000_000;
const EMPTY = { add: [], duplicates: [], errors: [] };

/** previewImport plus the checks only the Store knows: duplicates by name + city across every folder, and a researcher's Qualified cap. */
async function checkedPreview(csv: string): Promise<{ preview: ImportPreview; error?: string } | { preview?: undefined; error: string }> {
  const c = await checkPerm("leads.add");
  if (!c.ok) return { error: c.message };
  const p = previewImport(csv, await c.store.knownContacts());
  if (!p.ok) return { preview: p };
  const cap = limitOf(c.session, "leads.edit") === "to_qualified";
  const add: ImportPreview["add"] = [];
  for (const row of p.add) {
    if (cap && (FLOW_RANK[row.lead.stage] ?? 99) > FLOW_RANK.qualified!) {
      p.errors.push({ line: row.line, business: row.lead.business_name, error: "A researcher can take a lead up to Qualified." });
      continue;
    }
    const dup = await c.store.findDuplicate(row.lead);
    if (dup) {
      p.duplicates.push({ line: row.line, business: row.lead.business_name, matchedOn: `${dup.matchedOn} (already ${dup.holder === c.session.user.username ? "your" : dup.holderName + "'s"} lead)` });
      continue;
    }
    add.push(row);
  }
  p.add = add;
  return { preview: p };
}

export async function previewLeadsImport(csv: string): Promise<ImportPreview> {
  if (csv.length > MAX_CSV_BYTES) return { ok: false, error: "That file is too large. Import at most 200 rows at a time.", ...EMPTY };
  const r = await checkedPreview(csv);
  return r.preview ?? { ok: false, error: r.error, ...EMPTY };
}

export async function importLeads(csv: string): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  if (csv.length > MAX_CSV_BYTES) return { ok: false, error: "That file is too large." };
  const c = await checkPerm("leads.add");
  if (!c.ok) return { ok: false, error: c.message };
  // Re-check on the server: the preview the browser showed is never trusted.
  const r = await checkedPreview(csv);
  if (!r.preview) return { ok: false, error: r.error };
  if (!r.preview.ok) return { ok: false, error: r.preview.error ?? "The file couldn't be read." };
  if (!r.preview.add.length) return { ok: false, error: "There are no new leads to import." };
  try {
    const { added } = await c.store.importLeads(r.preview.add.map((a) => a.lead));
    revalidatePath("/leads");
    return { ok: true, added };
  } catch (e) {
    return { ok: false, error: say(e, "We couldn't import the leads. Nothing was added.") };
  }
}

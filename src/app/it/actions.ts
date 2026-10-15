"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { todayIso } from "@/lib/clock";
import { finderToInput } from "@/lib/it/fromFinder";
import { fromFormData, parseProspect, parseSignalInput } from "@/lib/it/form";
import { parseItCsv } from "@/lib/it/importCsv";
import { prospectKeys } from "@/lib/it/keys";
import { isItStage, QUALIFIER, type ItStage, type Qualifier } from "@/lib/it/model";
import { checkIt } from "@/lib/it/server";
import { StoreError } from "@/lib/store/errors";

const say = (e: unknown, fallback: string) => (e instanceof StoreError ? e.message : fallback);
const refresh = (id?: string) => {
  revalidatePath("/it", "layout");
  if (id) revalidatePath(`/it/prospects/${id}`);
};

export async function createProspectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkIt("it.add");
  if (!c.ok) return { ok: false, message: c.message };
  const get = fromFormData(fd);
  const p = parseProspect(get);
  if (!p.ok) return { ok: false, message: p.error };
  let signal = null;
  if (get("signalType")) {
    const s = parseSignalInput(get);
    if (!s.ok) return { ok: false, message: s.error };
    signal = s.value;
  }
  let id: string;
  try {
    id = (await c.store.it().createProspect(p.value, { signal, source: signal ? "signal" : "manual" })).id;
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the prospect. Try again.") };
  }
  refresh();
  redirect(`/it/prospects/${id}`);
}

export async function updateProspectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkIt("it.edit");
  if (!c.ok) return { ok: false, message: c.message };
  const id = String(fd.get("id") ?? "");
  const p = parseProspect(fromFormData(fd));
  if (!p.ok) return { ok: false, message: p.error };
  try {
    await c.store.it().updateProspect(id, p.value);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the changes. Try again.") };
  }
  refresh(id);
  return { ok: true, message: "Saved." };
}

export async function setQualifierAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkIt("it.edit");
  if (!c.ok) return { ok: false, message: c.message };
  const id = String(fd.get("id") ?? "");
  const q = Object.fromEntries(QUALIFIER.map((f) => [f.key, fd.get(f.key) === "on"])) as Qualifier;
  try {
    await c.store.it().setQualifier(id, q);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the qualifier. Try again.") };
  }
  refresh(id);
  return { ok: true, message: "Qualifier saved." };
}

export async function moveItStageAction(id: string, to: ItStage): Promise<FormState> {
  const c = await checkIt("it.edit");
  if (!c.ok) return { ok: false, message: c.message };
  if (!isItStage(to)) return { ok: false, message: "That isn't a stage." };
  try {
    await c.store.it().moveStage(id, to);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't move the prospect. Try again.") };
  }
  refresh(id);
  return { ok: true, message: "Moved." };
}

export async function assignProspectAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkIt("it.assign");
  if (!c.ok) return { ok: false, message: c.message };
  const id = String(fd.get("id") ?? "");
  const to = String(fd.get("to") ?? "");
  try {
    await c.store.it().assign(id, to || null);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't assign the prospect. Try again.") };
  }
  refresh(id);
  return { ok: true, message: to ? "Assigned." : "Assignment cleared." };
}

export async function deleteProspectAction(fd: FormData) {
  const c = await checkIt("it.edit");
  const id = String(fd.get("id") ?? "");
  if (!c.ok || !id) return;
  try { await c.store.it().deleteProspect(id); } catch { return; }
  refresh();
  redirect("/it/prospects");
}

export async function addSignalAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkIt("it.add");
  if (!c.ok) return { ok: false, message: c.message };
  const id = String(fd.get("id") ?? "");
  const s = parseSignalInput(fromFormData(fd));
  if (!s.ok) return { ok: false, message: s.error };
  try {
    await c.store.it().addSignal(id, s.value);
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the signal. Try again.") };
  }
  refresh(id);
  return { ok: true, message: "Signal added." };
}

export async function deleteSignalAction(fd: FormData) {
  const c = await checkIt("it.edit");
  const id = String(fd.get("id") ?? "");
  const signalId = String(fd.get("signalId") ?? "");
  if (!c.ok || !id || !signalId) return;
  try { await c.store.it().deleteSignal(id, signalId); } catch { return; }
  refresh(id);
}

export async function itCommentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkIt("it.comment");
  if (!c.ok) return { ok: false, message: c.message };
  const id = String(fd.get("id") ?? "");
  try {
    await c.store.it().addComment(id, String(fd.get("note") ?? ""));
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the comment. Try again.") };
  }
  refresh(id);
  return { ok: true, message: "Comment added." };
}

export type InboxResult = { ok: true; message: string; prospectId: string; attached: boolean } | { ok: false; message: string } | null;

/** The signals inbox: a new prospect with its signal, or the signal added to the matching prospect the person already works. */
export async function saveSignalAction(_prev: InboxResult, fd: FormData): Promise<InboxResult> {
  const c = await checkIt("it.add");
  if (!c.ok) return { ok: false, message: c.message };
  const get = fromFormData(fd);
  const p = parseProspect(get);
  if (!p.ok) return { ok: false, message: p.error };
  const s = parseSignalInput(get);
  if (!s.ok) return { ok: false, message: s.error };
  const it = c.store.it();
  try {
    const dup = await it.findDuplicate({ ...p.value, mapsUrl: "" });
    if (dup) {
      if (!dup.canEdit) {
        const whose = dup.holder === c.session.user.username ? "your" : `${dup.holderName}'s`;
        return { ok: false, message: `Already ${whose} prospect “${dup.company}” (same ${dup.matchedOn}). Ask them to add this signal.` };
      }
      await it.addSignal(dup.prospectId, s.value);
      refresh(dup.prospectId);
      return { ok: true, message: `Added the signal to your prospect “${dup.company}”.`, prospectId: dup.prospectId, attached: true };
    }
    const made = await it.createProspect(p.value, { signal: s.value, source: "signal" });
    refresh(made.id);
    return { ok: true, message: `Saved “${made.company}” as a new prospect.`, prospectId: made.id, attached: false };
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't save the signal. Try again.") };
  }
}

// ---- CSV import. The browser's preview is never trusted: apply re-reads and re-checks the file.
const MAX_CSV_BYTES = 1_000_000;

export interface ItImportPreviewRow { line: number; company: string; action: "add" | "attach" | "duplicate" | "error"; detail: string; signal: string }
export type ItImportPreview = { ok: true; rows: ItImportPreviewRow[]; unknownHeaders: string[] } | { ok: false; error: string };

async function planImport(csv: string) {
  if (csv.length > MAX_CSV_BYTES) return { ok: false as const, error: "That file is too large. Import at most 200 rows at a time." };
  const c = await checkIt("it.add");
  if (!c.ok) return { ok: false as const, error: c.message };
  const parsed = parseItCsv(csv, todayIso());
  if (!parsed.ok) return { ok: false as const, error: parsed.error };
  const it = c.store.it();
  const seen = new Map<string, number>();
  const plan = [];
  for (const r of parsed.rows) {
    if (!r.input) { plan.push({ row: r, action: "error" as const, detail: r.error ?? "This row couldn't be read.", dupId: null }); continue; }
    const keys = prospectKeys({ ...r.input, mapsUrl: "" });
    const earlier = keys.map((k) => seen.get(k)).find((x) => x !== undefined);
    if (earlier !== undefined) { plan.push({ row: r, action: "duplicate" as const, detail: `Same company as line ${earlier} of this file.`, dupId: null }); continue; }
    keys.forEach((k) => seen.set(k, r.line));
    const dup = await it.findDuplicate({ ...r.input, mapsUrl: "" });
    if (!dup) { plan.push({ row: r, action: "add" as const, detail: "New prospect", dupId: null }); continue; }
    const whose = dup.holder === c.session.user.username ? "your" : `${dup.holderName}'s`;
    if (dup.canEdit && r.signal) plan.push({ row: r, action: "attach" as const, detail: `Signal added to ${whose} prospect “${dup.company}”`, dupId: dup.prospectId });
    else plan.push({ row: r, action: "duplicate" as const, detail: `Already ${whose} prospect “${dup.company}” (same ${dup.matchedOn})`, dupId: null });
  }
  return { ok: true as const, c, plan, unknownHeaders: parsed.unknownHeaders };
}

export async function previewItImport(csv: string): Promise<ItImportPreview> {
  const p = await planImport(csv);
  if (!p.ok) return p;
  return {
    ok: true, unknownHeaders: p.unknownHeaders,
    rows: p.plan.map(({ row, action, detail }) => ({ line: row.line, company: row.company, action, detail, signal: row.signal ? row.signal.type : "" })),
  };
}

export async function applyItImport(csv: string): Promise<{ ok: true; added: number; attached: number; failed: string[] } | { ok: false; error: string }> {
  const p = await planImport(csv);
  if (!p.ok) return p;
  const it = p.c.store.it();
  let added = 0, attached = 0;
  const failed: string[] = [];
  for (const step of p.plan) {
    try {
      if (step.action === "add") { await it.createProspect(step.row.input!, { signal: step.row.signal ?? null, source: "import" }); added++; }
      else if (step.action === "attach" && step.dupId && step.row.signal) { await it.addSignal(step.dupId, step.row.signal); attached++; }
    } catch (e) {
      failed.push(`Line ${step.row.line}: ${say(e, "couldn't be saved")}`);
    }
  }
  refresh();
  return { ok: true, added, attached, failed };
}

// ---- The IT finder's "Add to prospects".
export async function addFinderBusinessAction(businessId: string): Promise<{ ok: true; prospectId: string } | { ok: false; message: string }> {
  const c = await checkIt("it.finder");
  if (!c.ok) return { ok: false, message: c.message };
  const ck = await checkIt("it.add");
  if (!ck.ok) return { ok: false, message: ck.message };
  const it = c.store.it();
  const b = await it.finder().getBusiness(businessId);
  if (!b) return { ok: false, message: "That business isn't in your IT finder list." };
  if (b.movedLeadId) return { ok: true, prospectId: b.movedLeadId };
  try {
    const made = await it.createProspect(finderToInput(b), { source: "finder", finderBusinessId: b.id });
    refresh();
    return { ok: true, prospectId: made.id };
  } catch (e) {
    return { ok: false, message: say(e, "We couldn't add it. Try again.") };
  }
}

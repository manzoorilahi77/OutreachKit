"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { parseLeadForm } from "@/lib/leads/form";
import { stageChangePatch, touchPatch, SEQUENCE } from "@/lib/leads/sequence";
import type { Channel, Stage } from "@/lib/leads/stages";
import { STAGES } from "@/lib/leads/stages";
import { createClient, getSession } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** The rep's local date comes from their browser; fall back to the server's date. */
const dayOf = (v: unknown) => (typeof v === "string" && ISO.test(v) ? v : new Date().toISOString().slice(0, 10));

type ParsedLead = Extract<ReturnType<typeof parseLeadForm>, { ok: true }>["value"];

function toRow(v: ParsedLead): TablesInsert<"leads"> {
  const { checks, ...fields } = v;
  return { ...fields, ...checks };
}

export async function createLead(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await getSession())) return { ok: false, message: "Sign in first." };
  const parsed = parseLeadForm(fd);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const kitId = String(fd.get("kit_id") ?? "");
  const row = { ...toRow(parsed.value), ...(/^[0-9a-f-]{36}$/.test(kitId) ? { kit_id: kitId } : {}) };
  const { data, error } = await (await createClient()).from("leads").insert(row).select("id").single();
  if (error || !data) return { ok: false, message: "We couldn't save the lead. Try again." };
  revalidatePath("/leads");
  redirect(`/leads/${data.id}`);
}

export async function updateLead(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await getSession())) return { ok: false, message: "Sign in first." };
  const id = String(fd.get("id") ?? "");
  const parsed = parseLeadForm(fd);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const { error } = await (await createClient()).from("leads").update(toRow(parsed.value)).eq("id", id);
  if (error) return { ok: false, message: "We couldn't save the lead. Try again." };
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Saved." };
}

const LEAD_STATE = "id, stage, replied, first_contact_date, demo_built_date, sequence_step, next_action_date, channel";

export async function moveStage(id: string, to: Stage, today?: string): Promise<FormState> {
  if (!STAGES.some((s) => s.value === to)) return { ok: false, message: "Choose a stage." };
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select(LEAD_STATE).eq("id", id).maybeSingle();
  if (!lead) return { ok: false, message: "That lead wasn't found." };
  const day = dayOf(today);
  const patch = stageChangePatch(lead, to, day);
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) return { ok: false, message: "We couldn't move the lead. Try again." };
  if (to === "contacted" && lead.stage !== "contacted") {
    // The first message is the Day 0 touch.
    await supabase.from("lead_events").insert({ lead_id: id, kind: "touch", channel: lead.channel ?? "instagram_dm", occurred_on: day, note: SEQUENCE[0]!.title });
    if (!lead.channel) await supabase.from("leads").update({ channel: "instagram_dm" }).eq("id", id);
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Moved." };
}

export async function logTouch(id: string, channel: Channel, today?: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select(LEAD_STATE).eq("id", id).maybeSingle();
  if (!lead) return { ok: false, message: "That lead wasn't found." };
  if (!lead.first_contact_date) return { ok: false, message: "Move the lead to Contacted first." };
  if (lead.sequence_step >= SEQUENCE.length) return { ok: false, message: "Every step of the sequence is done." };
  const day = dayOf(today);
  const step = SEQUENCE[lead.sequence_step]!;
  const { error } = await supabase.from("lead_events").insert({ lead_id: id, kind: "touch", channel, occurred_on: day, note: step.title });
  if (error) return { ok: false, message: "We couldn't log the touch. Try again." };
  await supabase.from("leads").update(touchPatch(lead)).eq("id", id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return { ok: true, message: "Logged." };
}

export async function deleteLead(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  if (!(await getSession()) || !id) return;
  await (await createClient()).from("leads").delete().eq("id", id);
  revalidatePath("/leads");
  redirect("/leads");
}

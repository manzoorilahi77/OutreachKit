"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions";
import { checkPerm } from "@/lib/auth/server";
import { SECTIONS } from "@/content/sections";

export async function setRequiredAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await checkPerm("playbook.required");
  if (!c.ok) return { ok: false, message: c.message };
  const ids = fd.getAll("section").map(String).filter((id) => SECTIONS.some((s) => s.id === id));
  await c.store.setRequired(ids);
  revalidatePath("/", "layout");
  return { ok: true, message: ids.length ? `${ids.length} section${ids.length === 1 ? "" : "s"} marked required.` : "No section is required now." };
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateKit } from "@/lib/kit/validate";
import { safeNext } from "@/lib/safe-next";
import { createClient, getSession } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export type FormState = { ok: boolean; message: string } | null;

async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return h.get("origin") ?? `${proto}://${host}`;
}

export async function requestSignIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!supabaseConfigured()) return { ok: false, message: "Sign-in is not set up on this site yet." };
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "That email address doesn't look right." };
  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { ok: false, message: "We couldn't send the link. Try again in a minute." };
  return { ok: true, message: `We sent a sign-in link to ${email}. It works once and expires in an hour.` };
}

export async function signOut() {
  if (supabaseConfigured()) await (await createClient()).auth.signOut();
  redirect("/");
}

export async function saveKit(raw: { category: string; device: string; state: string; city: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to save this kit." };
  const v = validateKit(raw);
  if (!v.ok) return v;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kits")
    .insert({ category: v.value.category, device: v.value.device, state: v.value.state, city: v.value.city, city_is_free: v.value.cityIsFree })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "We couldn't save the kit. Try again." };
  revalidatePath("/kits");
  return { ok: true, id: data.id };
}

export async function deleteKit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!(await getSession()) || !id) return;
  await (await createClient()).from("kits").delete().eq("id", id);
  revalidatePath("/kits");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in first." };
  const device = formData.get("default_device") === "mobile" ? "mobile" : "desktop";
  const domain = String(formData.get("demo_domain") ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const { error } = await (await createClient())
    .from("profiles")
    .update({
      name: String(formData.get("name") ?? "").trim().slice(0, 120),
      studio: String(formData.get("studio") ?? "").trim().slice(0, 120),
      demo_domain: domain.slice(0, 200),
      default_device: device,
    })
    .eq("id", session.user.id);
  if (error) return { ok: false, message: "We couldn't save your details. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

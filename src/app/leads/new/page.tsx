import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createLead } from "@/app/leads/actions";
import { LeadForm } from "@/components/leads/LeadForm";
import { TodayInput } from "@/components/leads/TodayInput";
import { SectionHead } from "@/components/ui/SectionHead";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add a lead" };

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<{ kit?: string }> }) {
  if (!(await getSession())) redirect("/login?next=/leads/new");
  const { kit: kitParam } = await searchParams;
  const kit = kitParam && /^[0-9a-f-]{36}$/.test(kitParam)
    ? (await (await createClient()).from("kits").select("*").eq("id", kitParam).maybeSingle()).data
    : null;
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <p><Link href="/leads">← Leads</Link></p>
      <SectionHead num="Pipeline" title="Add a lead" sub={kit ? `From your saved kit: ${kit.category} in ${kit.city}, ${kit.state}.` : "One row per business."} />
      <LeadForm
        action={createLead}
        kitId={kit?.id}
        defaults={kit ? { category: kit.category, city: kit.city, state: kit.state } : undefined}
        submitLabel="Add lead"
      />
      <TodayInput />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImportLeads } from "@/components/leads/ImportLeads";
import { SectionHead } from "@/components/ui/SectionHead";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import leads" };

export default async function ImportLeadsPage() {
  if (!(await getSession())) redirect("/login?next=/leads/import");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <p><Link href="/leads">← Leads</Link></p>
      <SectionHead
        num="Pipeline"
        title="Import leads"
        sub="Bring in a CSV, such as the one the Cowork prospecting task writes. Nothing is sent to anyone. Duplicates of leads you already have are skipped, never overwritten."
      />
      <ImportLeads />
    </div>
  );
}

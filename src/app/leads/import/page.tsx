import type { Metadata } from "next";
import Link from "next/link";
import { ImportLeads } from "@/components/leads/ImportLeads";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Import leads" };

export default async function ImportLeadsPage() {
  await requirePerm("leads.add");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <p><Link href="/leads">← Leads</Link></p>
      <SectionHead
        num="Pipeline"
        title="Import leads"
        sub="Bring in a CSV, such as the one the Cowork prospecting task writes, or the one you exported before the team setup. Nothing is sent to anyone. A business that is already someone's lead is skipped, never overwritten."
      />
      <ImportLeads />
    </div>
  );
}

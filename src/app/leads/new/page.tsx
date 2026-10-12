import type { Metadata } from "next";
import Link from "next/link";
import { createLead } from "@/app/leads/actions";
import { LeadForm } from "@/components/leads/LeadForm";
import { TodayInput } from "@/components/leads/TodayInput";
import { SectionHead } from "@/components/ui/SectionHead";
import { limitOf } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { isId } from "@/lib/store/paths";

export const metadata: Metadata = { title: "Add a lead" };

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<{ kit?: string }> }) {
  const s = await requirePerm("leads.add");
  const { kit: kitParam } = await searchParams;
  const kit = isId(kitParam) ? await storeFor(s).getKit(s.user.username, kitParam) : null;
  const queue = s.perms["leads.add"].scope === "queue";
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 sm:px-6">
      <p><Link href="/leads">← Leads</Link></p>
      <SectionHead
        num="Pipeline"
        title="Add a lead"
        sub={kit ? `From your saved kit: ${kit.title}.` : queue ? "One row per business. It goes into the unassigned queue until a manager gives it to a BD." : "One row per business. A business that is already someone's lead is refused."}
      />
      <LeadForm
        action={createLead}
        kitId={kit?.id}
        defaults={kit ? { category: kit.category, city: kit.city, state: kit.state } : undefined}
        submitLabel="Add lead"
        restricted={limitOf(s, "leads.edit") === "to_qualified"}
      />
      <TodayInput />
    </div>
  );
}

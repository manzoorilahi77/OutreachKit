import type { Metadata } from "next";
import Link from "next/link";
import { createProspectAction } from "@/app/it/actions";
import { PageHead } from "@/components/it/PageHead";
import { ProspectForm } from "@/components/it/ProspectForm";
import { todayIso } from "@/lib/clock";
import { requireIt } from "@/lib/it/server";

export const metadata: Metadata = { title: "Add an IT prospect" };

export default async function NewProspectPage() {
  const { on } = await requireIt("it.add");
  if (!on) return null;
  return (
    <div className="space-y-6">
      <p><Link href="/it/prospects">← Prospects</Link></p>
      <PageHead title="Add a prospect" sub="For a company you found yourself. To save a job post or tender, the signals inbox reads it for you." />
      <ProspectForm action={createProspectAction} submitLabel="Save prospect" withSignal today={todayIso()} />
    </div>
  );
}

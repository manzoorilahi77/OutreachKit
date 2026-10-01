import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KitView } from "@/components/kit/KitView";
import { STATES } from "@/data";
import type { StateCode } from "@/data";
import { findCategory } from "@/lib/kit/categories";
import { generateKit } from "@/lib/kit/generate";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved kit" };

export default async function KitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/kits/${id}`)}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: kit } = await (await createClient()).from("kits").select("*").eq("id", id).maybeSingle();
  if (!kit || !(kit.state in STATES) || !findCategory(kit.category)) notFound();
  const p = session.profile;
  const built = generateKit({
    cat: kit.category, device: kit.device, st: kit.state as StateCode, city: kit.city,
    you: p?.name, brand: p?.studio, domain: p?.demo_domain,
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <p><Link href="/kits">← Saved kits</Link></p>
      <KitView
        kit={built}
        actions={<Link href={`/leads/new?kit=${kit.id}`} className="inline-flex min-h-11 items-center">Create a lead from this kit</Link>}
      />
    </div>
  );
}

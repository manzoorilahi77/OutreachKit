import type { Metadata } from "next";
import Link from "next/link";
import { ImportProspects } from "@/components/it/ImportProspects";
import { PageHead } from "@/components/it/PageHead";
import { SignalInbox } from "@/components/it/SignalInbox";
import { Note } from "@/components/ui/Note";
import { todayIso } from "@/lib/clock";
import { SIGNAL_TYPES } from "@/lib/it/model";
import { requireIt } from "@/lib/it/server";

export const metadata: Metadata = { title: "Signals inbox" };

export default async function SignalsPage() {
  const { on } = await requireIt("it.add");
  if (!on) return null;
  return (
    <div className="space-y-10">
      <PageHead title="Signals inbox" sub="A buying signal is a dated, public reason to write: an open developer role, a project post, a tender. Paste one and save it as a prospect." />
      <Note tone="quiet">
        <p>LinkedIn, Indeed, Upwork, Wellfound, Clutch and Reddit don&apos;t allow automated collection, so this app never fetches them. Find posts with the <Link href="/it/search">search strings</Link>, read them yourself, and paste the good ones here.</p>
      </Note>
      <section aria-labelledby="paste-h" className="space-y-4">
        <h2 id="paste-h" className="text-2xl">Paste a post</h2>
        <SignalInbox today={todayIso()} />
      </section>
      <section aria-labelledby="kinds-h" className="space-y-3">
        <h2 id="kinds-h" className="text-2xl">What counts as a signal</h2>
        <dl className="grid gap-3 md:grid-cols-2">
          {SIGNAL_TYPES.map((t) => (
            <div key={t.value} className="rounded-lg border border-line bg-surface p-4">
              <dt className="font-medium">{t.label} <span className="text-sm text-muted">· stale after {t.staleDays} days</span></dt>
              <dd className="mt-1">{t.what}</dd>
              <dd className="mt-1 text-muted">For example: {t.example}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section id="import" aria-labelledby="imp-h" className="space-y-4">
        <h2 id="imp-h" className="text-2xl">Import a CSV</h2>
        <ImportProspects />
      </section>
    </div>
  );
}

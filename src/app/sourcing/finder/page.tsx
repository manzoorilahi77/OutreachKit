import type { Metadata } from "next";
import { FinderPage } from "@/components/scrape/FinderPage";
import { Note } from "@/components/ui/Note";
import { SectionHead } from "@/components/ui/SectionHead";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Lead finder" };

export default async function FinderRoute() {
  const s = await requirePerm("finder.run");
  const ws = await storeFor(s).getWorkspace();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Sourcing" title="Lead finder" sub="Searches Google Maps from this computer and saves every business it finds, with or without a website, as a lead for you. Results are checked against everyone's, so nobody sources the same business twice." />
      {ws.features.leadFinder
        ? <FinderPage canMove={can(s, "leads.add")} />
        : <Note tone="firm"><p>The lead finder is switched off for this workspace. Ask your super admin to turn it on.</p></Note>}
    </div>
  );
}

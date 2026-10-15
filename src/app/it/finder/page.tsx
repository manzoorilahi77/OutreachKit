import type { Metadata } from "next";
import { ItFinderPage } from "@/components/it/ItFinder";
import { PageHead } from "@/components/it/PageHead";
import { can } from "@/lib/auth/permissions";
import { requireIt } from "@/lib/it/server";

export const metadata: Metadata = { title: "IT finder" };

export default async function ItFinderRoute() {
  const { s, on } = await requireIt("it.finder");
  if (!on) return null;
  return (
    <div className="space-y-8">
      <PageHead title="IT finder" sub="Finds digital agencies, software houses and IT firms on Google Maps, the white-label partners of the Reset. Results stay in IT Prospects until you add them as prospects." />
      <ItFinderPage canAdd={can(s, "it.add")} />
    </div>
  );
}

import type { Metadata } from "next";
import { FeaturesForm } from "@/components/admin/FeaturesForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Feature switches" };

export default async function PlatformFeatures() {
  const s = await requirePerm("content.approve");
  const ws = await storeFor(s).getWorkspace();
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Platform" title="Feature switches" sub="Saved in the workspace settings. A change applies to everyone straight away." />
      <FeaturesForm leadFinder={ws.features.leadFinder} softwareTrack={ws.features.softwareTrack} />
    </div>
  );
}

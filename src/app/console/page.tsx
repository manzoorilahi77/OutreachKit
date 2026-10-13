import type { Metadata } from "next";
import { ConsoleScreen } from "@/components/console/ConsoleScreen";
import { MarkRead } from "@/components/playbook/MarkRead";
import { SectionHead } from "@/components/ui/SectionHead";
import { can } from "@/lib/auth/permissions";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { findSection } from "@/lib/playbook";
import { cleanRates } from "@/lib/market/currency";

export const metadata: Metadata = { title: "Kit Console" };

export default async function ConsolePage() {
  const s = await requirePerm("kits.build");
  const ws = await storeFor(s).getWorkspace();
  const intro = findSection("kitsec")!;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <MarkRead id="kitsec" />
      <SectionHead num={intro.title} title="Kit Console" sub={intro.sub} />
      <ConsoleScreen
        initialDetails={{ you: s.user.fullName, brand: ws.studio, domain: ws.demoDomain }}
        initialDevice={s.profile.defaultDevice}
        canSave={can(s, "kits.save")}
        canMoveLeads={can(s, "leads.add")}
        finderEnabled={can(s, "finder.run") && ws.features.leadFinder}
        rates={cleanRates(ws.markets?.rates)}
      />
    </div>
  );
}

import { Console } from "@/components/console/Console";
import { SectionHead } from "@/components/ui/SectionHead";
import { findSection } from "@/lib/playbook";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getSession } from "@/lib/supabase/server";

export default async function Home() {
  const session = await getSession();
  const p = session?.profile;
  const intro = findSection("kitsec")!;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <SectionHead num={intro.title} title="Kit Console" sub={intro.sub} />
      <Console
        initialDetails={p ? { you: p.name, brand: p.studio, domain: p.demo_domain } : undefined}
        initialDevice={p?.default_device ?? "desktop"}
        saveMode={!supabaseConfigured() ? "off" : session ? "signed-in" : "signed-out"}
      />
    </div>
  );
}

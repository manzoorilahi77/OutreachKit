import { Console } from "@/components/console/Console";
import { Playbook } from "@/components/playbook/Playbook";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getSession } from "@/lib/supabase/server";

export default async function Home() {
  const session = await getSession();
  const p = session?.profile;
  return (
    <Playbook
      widgets={{
        console: (
          <Console
            initialDetails={p ? { you: p.name, brand: p.studio, domain: p.demo_domain } : undefined}
            initialDevice={p?.default_device ?? "desktop"}
            saveMode={!supabaseConfigured() ? "off" : session ? "signed-in" : "signed-out"}
          />
        ),
      }}
    />
  );
}

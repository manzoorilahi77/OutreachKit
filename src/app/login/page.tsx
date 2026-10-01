import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/account/SignInForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { safeNext } from "@/lib/safe-next";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSession()) redirect(next);
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <SectionHead num="Account" title="Sign in" sub="Save kits and track your leads. The playbook and the kit console work without an account." />
      {supabaseConfigured() ? (
        <SignInForm next={next} expired={sp.error === "link"} />
      ) : (
        <p>Sign-in is not set up on this site yet. The playbook and the kit console still work.</p>
      )}
    </div>
  );
}

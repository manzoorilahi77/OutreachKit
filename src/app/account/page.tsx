import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { ProfileForm } from "@/components/account/ProfileForm";
import { Button } from "@/components/ui/Button";
import { SectionHead } from "@/components/ui/SectionHead";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your details" };

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const p = session.profile;
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHead num="Account" title="Your details" sub="Filled in once and used in every kit: Step 4 of the console." />
      <ProfileForm profile={{ name: p?.name ?? "", studio: p?.studio ?? "", demo_domain: p?.demo_domain ?? "", default_device: p?.default_device ?? "desktop" }} />
      <div className="border-t border-line pt-6">
        <p className="mb-3 text-muted">Signed in as {session.user.email}.</p>
        <form action={signOut}><Button variant="secondary" type="submit">Sign out</Button></form>
      </div>
    </div>
  );
}

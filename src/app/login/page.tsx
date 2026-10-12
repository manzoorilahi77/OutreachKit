import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/LoginForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { getResolved } from "@/lib/auth/server";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const r = await getResolved();
  if (r.kind === "ok") redirect(r.session.mustChangePassword ? "/account/password" : r.session.home);
  if (r.kind === "no_access") redirect("/no-access");
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <SectionHead num="Famysys Outreach Kit" title="Sign in" sub="Use the username and temporary password your admin sent you. There is no sign-up and no email." />
      <LoginForm next={safeNext(sp.next)} />
    </div>
  );
}

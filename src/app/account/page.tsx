import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { ProfileForm } from "@/components/account/ProfileForm";
import { Button } from "@/components/ui/Button";
import { SectionHead } from "@/components/ui/SectionHead";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requirePerm } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Your details" };

export default async function AccountPage() {
  const s = await requirePerm("account.change_password");
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <SectionHead num="Account" title="Your details" sub="Your name and the company details in every kit come from your account and the workspace." />
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-muted">Name</dt><dd>{s.user.fullName}</dd></div>
        <div><dt className="text-sm text-muted">Username</dt><dd>{s.user.username}</dd></div>
        <div><dt className="text-sm text-muted">Role</dt><dd>{ROLE_LABELS[s.user.role]}{s.team ? ` · ${s.team.name}` : ""}</dd></div>
      </dl>
      <ProfileForm defaultDevice={s.profile.defaultDevice} />
      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Link href="/account/password" className="inline-flex min-h-11 items-center">Change my password</Link>
        <form action={signOut}><Button variant="secondary" type="submit">Sign out</Button></form>
      </div>
    </div>
  );
}

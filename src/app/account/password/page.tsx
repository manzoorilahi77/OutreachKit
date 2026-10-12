import type { Metadata } from "next";
import { PasswordForm } from "@/components/account/PasswordForm";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";
import { SectionHead } from "@/components/ui/SectionHead";
import { signOut } from "@/app/actions";
import { requirePerm } from "@/lib/auth/server";

export const metadata: Metadata = { title: "My password" };

export default async function PasswordPage() {
  const s = await requirePerm("account.change_password", { allowMustChange: true });
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-12 sm:px-6">
      <SectionHead
        num="Account"
        title={s.mustChangePassword ? "Set your own password" : "My password"}
        sub={s.mustChangePassword ? "You signed in with a temporary password. Choose your own to continue." : "Choose a new password. You stay signed in on this computer."}
      />
      {s.mustChangePassword && <Note tone="quiet"><p>Hello {s.user.fullName}. Your password is saved as a scrambled hash in your own folder. Nobody can read it back, including an admin.</p></Note>}
      <PasswordForm askCurrent={!s.mustChangePassword} />
      {s.mustChangePassword && (
        <form action={signOut} className="border-t border-line pt-4"><Button variant="ghost" type="submit">Sign out</Button></form>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/ui/Note";
import { SectionHead } from "@/components/ui/SectionHead";
import { getResolved } from "@/lib/auth/server";

export const metadata: Metadata = { title: "No access" };

const dateText = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default async function NoAccessPage() {
  const r = await getResolved();
  if (r.kind === "none") redirect("/login");
  if (r.kind === "ok") redirect(r.session.home);
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-12 sm:px-6">
      <SectionHead
        num="Account"
        title={r.status === "suspended" ? "Your account is paused" : "Your account is turned off"}
        sub={r.status === "suspended" ? "You keep your leads. You can use the Outreach Kit again when the pause ends or an admin lifts it." : "This account has been turned off. Ask your admin if you think that's a mistake."}
      />
      <Note tone="firm">
        <dl className="space-y-2">
          <div><dt className="text-sm text-muted">Account</dt><dd>{r.fullName}</dd></div>
          {r.reason && <div><dt className="text-sm text-muted">Reason</dt><dd>{r.reason}</dd></div>}
          {r.until && <div><dt className="text-sm text-muted">Pause ends</dt><dd>{dateText(r.until)} (you can sign in the day after)</dd></div>}
        </dl>
      </Note>
      <form action={signOut}><Button variant="secondary" type="submit">Sign out</Button></form>
    </div>
  );
}

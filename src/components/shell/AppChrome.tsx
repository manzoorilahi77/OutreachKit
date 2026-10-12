import Link from "next/link";
import { signOut } from "@/app/actions";
import { getResolved } from "@/lib/auth/server";
import { navFor } from "@/lib/auth/nav";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MobileNav } from "./MobileNav";
import { NavList } from "./NavList";
import { SyncControl } from "./SyncControl";

/**
 * The shell: a navy top bar, then (when signed in) a strip with the Sync control and who is signed in,
 * a sidebar from 1024px up, and a menu below that.
 */
export async function AppChrome({ children }: { children: React.ReactNode }) {
  const r = await getResolved();
  const session = r.kind === "ok" ? r.session : null;
  const signedIn = r.kind === "ok" || r.kind === "no_access";
  const nav = session && !session.mustChangePassword ? navFor(session.user.role).map(({ label, href }) => ({ label, href })) : [];

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-fill focus:text-on-fill focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="relative bg-navy text-warm border-b border-warm/20">
        <div className="flex items-center justify-between gap-3 pr-4 sm:pr-6">
          <Link href="/" aria-label="Famysys Outreach Kit, home" className="no-underline">
            <Logo kind="wordmark-white" height={22} clearSpace />
          </Link>
          <div className="flex items-center gap-2">
            {nav.length > 0 && <MobileNav items={nav} />}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {session && !session.mustChangePassword && (
        <div className="border-b border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
            <SyncControl />
            <div className="flex items-center gap-3">
              <span className="text-muted">
                {session.user.fullName} · {ROLE_LABELS[session.user.role]}
              </span>
              <form action={signOut}><Button variant="ghost" type="submit">Sign out</Button></form>
            </div>
          </div>
        </div>
      )}
      {signedIn && nav.length > 0 ? (
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden border-r border-line bg-surface lg:block">
            <nav aria-label="Main" className="sticky top-0 p-3">
              <NavList items={nav} />
            </nav>
          </aside>
          <main id="main" className="min-w-0">{children}</main>
        </div>
      ) : (
        <main id="main">{children}</main>
      )}
    </>
  );
}

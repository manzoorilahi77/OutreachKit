import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getSession } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const link = "inline-flex min-h-11 items-center whitespace-nowrap px-3 text-warm underline-offset-4 hover:underline";

// Navy bar, white wordmark. Clear space around the logo equals the anchor-mark width.
export async function SiteHeader() {
  const session = await getSession();
  return (
    <header className="bg-navy text-warm border-b border-warm/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pr-4 sm:pr-6">
        <Link href="/" aria-label="Famysys Outreach Kit, home" className="no-underline">
          <Logo kind="wordmark-white" height={22} clearSpace />
        </Link>
        <ThemeToggle />
      </div>
      <nav aria-label="Main" className="border-t border-warm/20">
        <ul className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 sm:px-4">
          <li><Link href="/" className={link}>Kit Console</Link></li>
          <li><Link href="/playbook" className={link}>Playbook</Link></li>
          {session && (
            <>
              <li><Link href="/kits" className={link}>Saved kits</Link></li>
              <li><Link href="/leads" className={link}>Leads</Link></li>
              <li><Link href="/account" className={link}>Your details</Link></li>
            </>
          )}
          {!session && supabaseConfigured() && <li><Link href="/login" className={link}>Sign in</Link></li>}
          <li className="ml-auto"><Link href="/styleguide" className={link}>Styleguide</Link></li>
        </ul>
      </nav>
    </header>
  );
}

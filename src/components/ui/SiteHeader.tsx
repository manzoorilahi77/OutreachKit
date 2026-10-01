import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// Navy bar, white wordmark. Clear space around the logo equals the anchor-mark width.
export function SiteHeader() {
  return (
    <header className="bg-navy text-warm border-b border-warm/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 pr-4 sm:pr-6">
        <Link href="/" aria-label="Famysys Outreach Kit, home" className="no-underline">
          <Logo kind="wordmark-white" height={22} clearSpace />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-2 sm:gap-4">
          <Link href="/styleguide" className="hidden min-h-11 items-center px-2 text-warm sm:inline-flex">
            Styleguide
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

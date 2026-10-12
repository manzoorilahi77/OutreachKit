"use client";

import { useState } from "react";
import type { NavItem } from "@/lib/auth/nav";
import { NavList } from "./NavList";

/** Below 1024px the navigation is a menu under the top bar. */
export function MobileNav({ items }: { items: Pick<NavItem, "label" | "href">[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-warm/50 px-3 text-sm text-warm hover:bg-warm/10"
      >
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <span>{open ? "Close" : "Menu"}</span>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="absolute inset-x-0 z-40 border-b border-line bg-bg px-4 py-3 shadow-sm">
          <NavList items={items} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </div>
  );
}

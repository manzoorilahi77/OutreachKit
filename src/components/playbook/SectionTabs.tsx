"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MASTHEAD } from "@/content/masthead";
import { sectionHref } from "@/lib/playbook";

/** Sticky strip of the 11 sections, each its own page. Scrolls inside itself on a phone. */
export function SectionTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Playbook sections" className="sticky top-0 z-30 border-b border-line bg-bg">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
        {MASTHEAD.nav.map((n) => {
          const id = n.id === "kit" ? "kitsec" : n.id;
          const href = sectionHref(id);
          const active = pathname === href;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center whitespace-nowrap border-b-4 px-3 text-base no-underline ${active ? "border-head font-medium" : "border-transparent"}`}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MASTHEAD } from "@/content/masthead";
import { sectionHref } from "@/lib/playbook";
import { EXTRA_SECTIONS } from "@/lib/playbookExt";

const NAV = [...MASTHEAD.nav, ...EXTRA_SECTIONS.map((x) => ({ id: x.id, label: x.num + "  " + x.title }))];

/** Sticky strip of the playbook sections (the ported 11 and the expansion's), each its own page. Scrolls inside itself on a phone. */
export function SectionTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Playbook sections" className="sticky top-0 z-30 border-b border-line bg-bg">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4">
        {NAV.map((n) => {
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

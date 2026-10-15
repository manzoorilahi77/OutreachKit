"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHref } from "@/lib/auth/nav";

/** The IT Prospects area's own tabs. The current page is marked by fill, not colour. */
export function ItTabs({ items }: { items: { label: string; href: string }[] }) {
  const active = activeHref(items, usePathname());
  return (
    <nav aria-label="IT Prospects">
      <ul className="flex flex-wrap gap-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={i.href === active ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-full border border-head px-4 font-medium text-head no-underline hover:bg-head/10 aria-[current=page]:bg-fill aria-[current=page]:text-on-fill"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

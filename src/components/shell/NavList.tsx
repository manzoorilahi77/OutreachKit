"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHref, type NavItem } from "@/lib/auth/nav";


export function NavList({ items, onNavigate }: { items: Pick<NavItem, "label" | "href">[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeHref(items, pathname);
  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const current = i.href.split("#")[0] === active;
        return (
          <li key={i.href + i.label}>
            <Link
              href={i.href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className="flex min-h-11 items-center rounded-md px-3 text-head no-underline hover:bg-head/10 aria-[current=page]:bg-fill aria-[current=page]:text-on-fill"
            >
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

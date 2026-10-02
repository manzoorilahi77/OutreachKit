import type { Metadata } from "next";
import Link from "next/link";
import { Masthead } from "@/components/playbook/Masthead";
import { PlaybookFooter } from "@/components/playbook/PlaybookFooter";
import { SECTIONS } from "@/content/sections";
import { sectionHref } from "@/lib/playbook";

export const metadata: Metadata = { title: "Playbook" };

export default function PlaybookIndex() {
  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link
                href={sectionHref(s.id)}
                className="flex h-full flex-col gap-2 rounded-lg border border-line bg-surface p-5 no-underline hover:border-head"
              >
                <span className="text-base font-medium tabular-nums text-muted">{s.num}</span>
                <span className="text-2xl font-medium leading-snug text-head">{s.title}</span>
                <span className="line-clamp-4 text-muted">{s.sub}</span>
                <span className="mt-auto pt-2 font-medium text-head underline underline-offset-4">
                  {s.id === "kitsec" ? "Open the Kit Console" : "Read this section"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <PlaybookFooter />
      </div>
    </>
  );
}

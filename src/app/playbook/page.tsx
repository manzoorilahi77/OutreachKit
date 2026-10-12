import type { Metadata } from "next";
import Link from "next/link";
import { Masthead } from "@/components/playbook/Masthead";
import { PlaybookFooter } from "@/components/playbook/PlaybookFooter";
import { SECTIONS } from "@/content/sections";
import { Chip } from "@/components/ui/Chip";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { sectionHref } from "@/lib/playbook";
import { START_HERE } from "@/lib/playbookPaths";

export const metadata: Metadata = { title: "Playbook" };

export default async function PlaybookIndex() {
  const s = await requirePerm("playbook.read");
  const store = storeFor(s);
  const [pb, required] = await Promise.all([store.getPlaybook(), store.requiredFor(s.user.username)]);
  const path = (START_HERE[s.user.role] ?? []).map((id) => SECTIONS.find((x) => x.id === id)).filter((x): x is (typeof SECTIONS)[number] => !!x);
  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6">
        {path.length > 0 && (
          <nav aria-label="Start here" className="space-y-3 rounded-lg border-2 border-head p-5">
            <h2 className="text-2xl">Start here</h2>
            <p className="text-muted">Your path through the playbook, in this order.</p>
            <ol className="flex flex-wrap gap-2">
              {path.map((x, i) => (
                <li key={x.id}>
                  <Link href={sectionHref(x.id)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-head px-4 text-head no-underline hover:bg-head/10">
                    <span className="tabular-nums text-muted">{i + 1}.</span> {x.num} {x.title}{pb.reads[x.id] ? " ✓" : ""}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((x) => (
            <li key={x.id}>
              <Link
                href={sectionHref(x.id)}
                className="flex h-full flex-col gap-2 rounded-lg border border-line bg-surface p-5 no-underline hover:border-head"
              >
                <span className="flex flex-wrap items-center gap-2 text-base font-medium tabular-nums text-muted">
                  {x.num}
                  {pb.reads[x.id] && <Chip>Read</Chip>}
                  {required.includes(x.id) && !pb.reads[x.id] && <Chip variant="tier-b">Required</Chip>}
                </span>
                <span className="text-2xl font-medium leading-snug text-head">{x.title}</span>
                <span className="line-clamp-4 text-muted">{x.sub}</span>
                <span className="mt-auto pt-2 font-medium text-head underline underline-offset-4">
                  {x.id === "kitsec" ? "Open the Kit Console" : "Read this section"}
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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BlocksView } from "@/components/playbook/BlockView";
import { PlaybookFooter } from "@/components/playbook/PlaybookFooter";
import { SectionTabs } from "@/components/playbook/SectionTabs";
import { SectionHead } from "@/components/ui/SectionHead";
import { CONSOLE_SECTION, findSection, neighbours, sectionHref } from "@/lib/playbook";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = findSection((await params).slug);
  return { title: s ? s.title : "Playbook" };
}

export default async function SectionPage({ params }: Params) {
  const { slug } = await params;
  if (slug === CONSOLE_SECTION || slug === "kit") redirect("/");
  const section = findSection(slug);
  if (!section) notFound();
  const { prev, next } = neighbours(section.id);
  return (
    <>
      <SectionTabs />
      <article id={section.id} className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <p><Link href="/playbook">← Playbook</Link></p>
        <SectionHead num={section.num} title={section.title} sub={section.sub} />
        <div className="space-y-5">
          <BlocksView blocks={section.blocks} />
        </div>
        <nav aria-label="Previous and next section" className="grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={sectionHref(prev.id)} className="rounded-lg border border-line p-4 no-underline hover:border-head">
              <span className="block text-sm text-muted">Previous · {prev.num}</span>
              <span className="font-medium text-head">{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={sectionHref(next.id)} className="rounded-lg border border-line p-4 no-underline hover:border-head sm:text-right">
              <span className="block text-sm text-muted">Next · {next.num}</span>
              <span className="font-medium text-head">{next.title}</span>
            </Link>
          )}
        </nav>
        <PlaybookFooter />
      </article>
    </>
  );
}

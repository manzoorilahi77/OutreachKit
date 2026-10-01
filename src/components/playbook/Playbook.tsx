import { MASTHEAD } from "@/content/masthead";
import { FOOTER } from "@/content/footer";
import { SECTIONS } from "@/content/sections";
import { SectionHead } from "@/components/ui/SectionHead";
import { BlocksView } from "./BlockView";
import { InlineView } from "./InlineView";
import { Masthead } from "./Masthead";
import { SectionNav } from "./SectionNav";

// The original's nav links to #kit, which is the kit output div, not the section (#kitsec). Point it at the section.
const NAV = MASTHEAD.nav.map((n) => (n.id === "kit" ? { ...n, id: "kitsec" } : n));

export function Playbook({ widgets }: { widgets?: Partial<Record<string, React.ReactNode>> }) {
  return (
    <>
      <Masthead />
      <SectionNav items={NAV} />
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="space-y-5">
            <SectionHead id={`${s.id}-h`} num={s.num} title={s.title} sub={s.sub} />
            <BlocksView blocks={s.blocks} widgets={widgets} />
          </section>
        ))}
        <footer className="space-y-3 border-t-2 border-head pt-5">
          {FOOTER.map((f, i) => (
            <p key={i} className="max-w-3xl text-sm text-muted"><InlineView parts={f} /></p>
          ))}
        </footer>
      </div>
    </>
  );
}

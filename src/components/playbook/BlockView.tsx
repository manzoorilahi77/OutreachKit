import type { Block } from "@/content/types";
import { Chip } from "@/components/ui/Chip";
import { Note } from "@/components/ui/Note";
import { StatTile } from "@/components/ui/StatTile";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { Board } from "./Board";
import { CopyHeader } from "./CopyHeader";
import { InlineView, chipVariant } from "./InlineView";
import { RatiosTable } from "@/components/leads/RatiosTable";
import { Scorer } from "./Scorer";

const cellKind = { name: "font-medium text-head", n: "tabular-nums", mono: "tabular-nums font-medium text-head" } as const;

/** Renders a run of blocks; the scorer widget takes the verdict note that follows it. */
export function BlocksView({ blocks, widgets }: { blocks: Block[]; widgets?: Partial<Record<string, React.ReactNode>> }) {
  return (
    <>
      {blocks.map((b, i) => {
        const next = blocks[i + 1];
        if (b.type === "widget" && b.id === "scorer")
          return <Scorer key={i} fine={next?.type === "scorerVerdict" ? next.fine : undefined} />;
        return <BlockView key={i} block={b} widgets={widgets} />;
      })}
    </>
  );
}

export function BlockView({ block, widgets = {} }: { block: Block; widgets?: Partial<Record<string, React.ReactNode>> }) {
  switch (block.type) {
    case "p":
      return (
        <p className={block.variant === "sub" ? "max-w-3xl text-lg text-muted" : block.variant === "fine" ? "max-w-3xl text-sm text-muted" : "max-w-3xl"}>
          <InlineView parts={block.inline} />
        </p>
      );
    case "h3":
      return <h3 className="mt-2 text-2xl leading-snug"><InlineView parts={block.inline} /></h3>;
    case "h4":
      return <h4 className="text-lg"><InlineView parts={block.inline} /></h4>;
    case "note":
      return (
        <Note tone={block.tone === "warn" ? "firm" : block.tone === "cool" ? "plain" : "quiet"}>
          <p className="max-w-3xl"><InlineView parts={block.inline} /></p>
        </Note>
      );
    case "stats":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {block.items.map((s) => <StatTile key={s.label} label={s.label} value={s.value} note={s.note} />)}
        </div>
      );
    case "cards":
      return (
        <div className={`grid gap-4 ${block.cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {block.cards.map((blocks, i) => (
            <div key={i} className="min-w-0 space-y-3 rounded-lg border border-line bg-surface p-5">
              <BlocksView blocks={blocks} widgets={widgets} />
            </div>
          ))}
        </div>
      );
    case "card":
      return (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-5">
          <BlocksView blocks={block.blocks} widgets={widgets} />
        </div>
      );
    case "chips":
      return <div className="flex flex-wrap gap-2">{block.items.map((c) => <Chip key={c.text} variant={chipVariant(c.tone)}>{c.text}</Chip>)}</div>;
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`max-w-3xl space-y-2 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((it, i) => <li key={i} className="pl-1"><InlineView parts={it} /></li>)}
        </Tag>
      );
    }
    case "steps":
      return (
        <ol className="max-w-3xl space-y-3">
          {block.items.map((it) => (
            <li key={it.n} className="flex gap-3">
              <span className="w-8 shrink-0 font-medium tabular-nums text-muted">{it.n}</span>
              <span><InlineView parts={it.inline} /></span>
            </li>
          ))}
        </ol>
      );
    case "ticks":
      return (
        <ul className="max-w-3xl space-y-3">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="w-6 shrink-0 text-xl font-medium leading-snug text-head">{it.mark}</span>
              <span><span className="sr-only">Disqualify: </span><InlineView parts={it.inline} /></span>
            </li>
          ))}
        </ul>
      );
    case "timeline":
      return (
        <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {block.items.map((it, i) => (
            <li key={i} className="grid gap-1 bg-surface p-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <span className="font-medium text-muted">{it.when}</span>
              <span className="space-y-1">
                <strong className="block"><InlineView parts={it.title} /></strong>
                <span className="block"><InlineView parts={it.text} /></span>
              </span>
            </li>
          ))}
        </ol>
      );
    case "table":
      if (block.rows[0]?.[0]?.inline[0] === "Profiles per hour") return <RatiosTable block={block} />;
      return (
        <TableWrap label={block.head.map((h) => h.map((x) => (typeof x === "string" ? x : "")).join("")).join(", ")}>
          <thead>
            <tr>{block.head.map((h, i) => <th key={i} scope="col" className={th}><InlineView parts={h} /></th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={`${td} ${c.kind ? cellKind[c.kind] : ""}`}><InlineView parts={c.inline} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      );
    case "scorerVerdict":
      return null; // rendered by the scorer above it
    case "widget":
      if (block.id === "board") return <Board />;
      if (block.id === "scorer") return <Scorer />;
      if (block.id === "copyHeader") return <CopyHeader label={block.label} />;
      return <>{widgets[block.id] ?? null}</>;
  }
}

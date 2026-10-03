"use client";

import { useState } from "react";
import type { Inline } from "@/content/types";
import { Chip } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { CopyChip } from "@/components/ui/CopyChip";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { InlineView } from "@/components/playbook/InlineView";
import { CHROME } from "@/lib/kit/text";
import type { Cell, Kit, KitNode } from "@/lib/kit/types";
import { DirectionPicker } from "./directions/DirectionPicker";

type DirectionId = "a" | "b" | "c";

const cellClass: Record<NonNullable<Cell["kind"]>, string> = {
  name: "font-medium text-head",
  n: "whitespace-nowrap tabular-nums",
  pitch: "min-w-56",
  small: "min-w-48 text-sm text-muted",
};

const para = { prose: "max-w-3xl", fine: "max-w-3xl text-sm text-muted", muted: "max-w-3xl text-sm text-muted" } as const;

function Table({ head, minWidth, rows }: { head: string[]; minWidth: number; rows: Cell[][] }) {
  return (
    <TableWrap label={head.join(", ")} minWidth={minWidth}>
      <thead><tr>{head.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => <td key={j} className={`${td} ${c.kind ? cellClass[c.kind] : ""}`}><InlineView parts={c.inline} /></td>)}
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

function Tabs({ tabs }: { tabs: Extract<KitNode, { k: "tabs" }>["tabs"] }) {
  const [on, setOn] = useState(0);
  const id = "tabs-" + tabs.map((t) => t.label).join("-").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  function onKey(e: React.KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (on + step + tabs.length) % tabs.length;
    setOn(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Cross-sell" className="inline-flex overflow-hidden rounded-md border border-head" onKeyDown={onKey}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            id={`${id}-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={i === on}
            aria-controls={`${id}-panel-${i}`}
            tabIndex={i === on ? 0 : -1}
            onClick={() => setOn(i)}
            className="min-h-11 px-4 text-base font-medium text-head aria-selected:bg-fill aria-selected:text-on-fill"
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} id={`${id}-panel-${i}`} role="tabpanel" aria-labelledby={`${id}-tab-${i}`} hidden={i !== on}>
          <Table {...t.table} />
        </div>
      ))}
    </div>
  );
}

function Node({ n, onDirection }: { n: KitNode; onDirection?: (id: DirectionId) => void }) {
  switch (n.k) {
    case "h4":
      return <h4 className="pt-2 text-xl"><InlineView parts={n.inline} /></h4>;
    case "p":
      return <p className={para[n.tone]}><InlineView parts={n.inline as Inline[]} /></p>;
    case "chips":
      return <div className="flex flex-wrap gap-2">{n.items.map((t, i) => <CopyChip key={i + t} text={t} />)}</div>;
    case "steps":
      return (
        <ol className="max-w-3xl space-y-3">
          {n.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-8 shrink-0 font-medium tabular-nums text-muted">{it.n}</span>
              <span><InlineView parts={it.inline} /></span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="max-w-3xl list-disc space-y-2 pl-6">
          {n.items.map((it, i) => <li key={i} className="pl-1"><InlineView parts={it} /></li>)}
        </ul>
      );
    case "pairs":
      return (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {n.items.map((it) => (
            <div key={it.dt} className="rounded-lg border border-line bg-surface p-3">
              <dt className="text-sm text-muted">{it.dt}</dt>
              <dd className={it.small ? "text-sm" : "font-medium text-head"}><InlineView parts={it.dd} /></dd>
            </div>
          ))}
        </dl>
      );
    case "copyBlock":
      return (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2">
            <span className="font-medium text-head">{n.label}</span>
            <CopyButton text={n.text} label={CHROME.copy} />
          </div>
          {n.pairs ? (
            <dl className="space-y-3 p-4">
              {n.pairs.map((p) => (
                <div key={p.term}>
                  <dt><strong>{p.term}</strong></dt>
                  <dd className="pl-4">— {p.def}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words p-4 font-sans text-base" tabIndex={0}>{n.text}</pre>
          )}
        </div>
      );
    case "openers":
      return (
        <ol className="grid gap-3 lg:grid-cols-2">
          {n.items.map((o, i) => (
            <li key={i} className="space-y-3 rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-medium tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <strong>{o[0]}</strong>
                </span>
                <span className="flex flex-wrap gap-2">
                  <CopyButton text={o[1]} label={CHROME.openerCopy} />
                  <CopyButton text={o[1] + "\n\n" + o[3]} label={CHROME.openerCopyLink} />
                </span>
              </div>
              <p className="text-lg">{o[1]}</p>
              <div><span className="block text-sm text-muted">{CHROME.hook}</span><p className="text-sm">{o[2]}</p></div>
              <div><span className="block text-sm text-muted">{CHROME.linkLine}</span><p className="break-words text-sm">{o[3]}</p></div>
            </li>
          ))}
        </ol>
      );
    case "table":
      return <Table head={n.head} minWidth={n.minWidth} rows={n.rows} />;
    case "timeline":
      return (
        <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {n.items.map((it, i) => (
            <li key={i} className="grid gap-1 bg-surface p-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <span className="font-medium text-muted">{it[0]}</span>
              <span className="space-y-1"><strong className="block">{it[1]}</strong><span className="block">{it[2]}</span></span>
            </li>
          ))}
        </ol>
      );
    case "ups":
      return (
        <ul className="grid gap-3 sm:grid-cols-2">
          {n.items.map((u, i) => (
            <li key={i} className="space-y-1 rounded-lg border border-line bg-surface p-4">
              <strong className="block">{u.name}</strong>
              <span className="block font-medium tabular-nums text-head">{u.price}</span>
              <span className="block text-sm text-muted">{u.why}</span>
            </li>
          ))}
        </ul>
      );
    case "directions":
      return <DirectionPicker items={n.items} selected={n.selected} onSelect={onDirection} />;
    case "tabs":
      return <Tabs tabs={n.tabs} />;
    case "ladder":
      return (
        <ol className="space-y-3">
          {n.rungs.map((r) => (
            <li key={r.rung} className="grid gap-1 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <span className="font-medium tabular-nums text-muted">{String(r.rung).padStart(2, "0")} · Day {r.day}</span>
              <span className="space-y-1">
                <strong className="block">{r.offer}</strong>
                <span className="block font-medium tabular-nums text-head">{r.price}</span>
                <span className="block text-sm"><span className="text-muted">Pitch when: </span>{r.trigger}</span>
                <span className="block">{r.line}</span>
              </span>
            </li>
          ))}
        </ol>
      );
  }
}

export function KitView({ kit, actions, extraChips = [], onDirection }: {
  kit: Kit;
  actions?: React.ReactNode;
  /** Chips the page adds, such as "Generic kit" when the category has no kit file. */
  extraChips?: string[];
  onDirection?: (id: DirectionId) => void;
}) {
  return (
    <article aria-label="Field kit" className="space-y-8">
      <header className="space-y-3 border-b border-line pb-5">
        <h3 className="text-3xl leading-tight">{kit.header.title}</h3>
        <div className="flex flex-wrap gap-2">
          {kit.header.chips.map((c) => (
            <Chip key={c.text} variant={c.tone === "a" ? "tier-a" : c.tone === "b" ? "tier-b" : c.tone === "c" ? "tier-c" : c.tone === "hot" ? "hot" : "plain"}>{c.text}</Chip>
          ))}
          {extraChips.map((t) => <Chip key={t}>{t}</Chip>)}
        </div>
        <p className="max-w-3xl text-lg text-muted">{kit.header.note}</p>
        {actions}
      </header>
      {kit.sections.map((s) => (
        <section key={s.id} aria-label={s.id} className="space-y-3">
          {s.nodes.map((n, i) => <Node key={i} n={n} onDirection={onDirection} />)}
        </section>
      ))}
    </article>
  );
}

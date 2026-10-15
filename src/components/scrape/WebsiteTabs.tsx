"use client";

import { useRef } from "react";
import type { WebsiteTab } from "@/lib/scrape/tabs";

const TABS: { id: WebsiteTab; label: string }[] = [
  { id: "without", label: "Without website" },
  { id: "with", label: "With website" },
];

/** Two tabs over the finder's saved businesses. The panel they control carries `id={`${idBase}-panel`}`. */
export function WebsiteTabs({ idBase, value, counts, onChange }: { idBase: string; value: WebsiteTab; counts: Record<WebsiteTab, number>; onChange: (t: WebsiteTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function key(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    onChange(TABS[n]!.id);
    refs.current[n]?.focus();
  }
  return (
    <div role="tablist" aria-label="Businesses by website" className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          id={`${idBase}-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-controls={`${idBase}-panel`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => key(e, i)}
          className="-mb-px min-h-11 border-b-2 border-transparent px-4 text-base font-medium text-muted hover:text-head aria-selected:border-head aria-selected:text-head"
        >
          {t.label}<span className="ml-2 tabular-nums">{counts[t.id]}</span>
        </button>
      ))}
    </div>
  );
}

"use client";

// The three design directions, each drawn as a live miniature in its own combo. Selecting one rebuilds
// the kit, so the build prompt below follows. The "Use this direction" buttons form the radio group
// (arrow keys move and select); the selection is announced through role="status".
import { useRef, useState } from "react";
import { CopyChip } from "@/components/ui/CopyChip";
import { Segmented } from "@/components/ui/Segmented";
import type { DirectionCard } from "@/lib/kit/types";
import { previewFonts } from "./fonts";
import { Preview, type PreviewDevice } from "./Preview";

type Id = DirectionCard["id"];

export function DirectionPicker({ items, selected, onSelect }: { items: DirectionCard[]; selected: Id; onSelect?: (id: Id) => void }) {
  const [devices, setDevices] = useState<Record<Id, PreviewDevice>>({ a: "desktop", b: "desktop", c: "desktop" });
  const radios = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = items.find((d) => d.id === selected) ?? items[0]!;

  function choose(id: Id, focus = false) {
    onSelect?.(id);
    if (focus) radios.current[id]?.focus();
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    choose(items[(i + step + items.length) % items.length]!.id, true);
  }

  return (
    <div className="space-y-3">
      <p role="status" className="text-sm text-muted">
        Direction {current.letter} selected: {current.name}, {current.siteType.toLowerCase()}, {current.themeName} ({current.themeId}).
      </p>
      <div role="radiogroup" aria-label="Design direction" className="grid gap-4 min-[1280px]:grid-cols-3">
        {items.map((d, i) => {
          const on = d.id === selected;
          const f = previewFonts(d.type.display, d.type.body);
          return (
            <div
              key={d.id}
              className={`space-y-4 rounded-lg border border-line bg-surface p-4 ${on ? "order-first outline-3 outline-offset-2 outline-accent min-[1280px]:order-none" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-lg font-medium text-head">Direction {d.letter} · {d.name}</h5>
                <Segmented
                  label={`Preview size for direction ${d.letter}`}
                  options={[{ value: "phone", label: "Phone" }, { value: "desktop", label: "Desktop" }]}
                  initial={devices[d.id]}
                  onChange={(v) => setDevices((s) => ({ ...s, [d.id]: v }))}
                />
              </div>
              <Preview d={d} device={devices[d.id]} />
              <p className="sr-only">
                Preview of a {d.siteType.toLowerCase()} homepage in {d.themeName}: headline “{d.headline}”, buttons {d.preview.ctas.join(" and ")},
                photo slots marked as placeholders.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-head">{d.tier} · {d.siteType}</p>
                <p className="text-sm text-muted">{d.mood.join(" · ")}</p>
                <p><span className="text-sm text-muted">Best for </span>{d.bestFor}</p>
                <p className="text-sm">{d.whyItFits}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted">{d.themeId} · {d.themeName} · {d.mode}</p>
                <ul className="flex flex-wrap gap-2" aria-label={`Colours for direction ${d.letter}`}>
                  {d.colors.map((c) => (
                    <li key={c.role} className="flex items-center gap-1">
                      <span aria-hidden className="size-6 shrink-0 rounded border border-line" style={{ background: c.hex }} />
                      <CopyChip text={`${c.role} ${c.hex}`} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`flex items-center gap-4 rounded-md border border-line p-3 ${f.className}`}>
                <span aria-hidden className="text-4xl leading-none" style={{ fontFamily: f.display }}>Aa</span>
                <span className="space-y-1">
                  <span className="block" style={{ fontFamily: f.body }}>{d.headline}</span>
                  <span className="block text-sm text-muted">{d.type.id} · {d.type.name} · {f.labels}</span>
                </span>
              </div>
              <button
                ref={(el) => { radios.current[d.id] = el; }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(d.id)}
                onKeyDown={(e) => onKey(e, i)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-head px-4 text-base font-medium text-head aria-checked:bg-fill aria-checked:text-on-fill"
              >
                {on ? `Using direction ${d.letter}` : `Use this direction`}
                <span className="sr-only">{on ? "" : `: ${d.letter}, ${d.name}`}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

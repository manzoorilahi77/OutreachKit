// A miniature homepage drawn in HTML and CSS: no images, no iframes. The combo's seven roles are set as
// custom properties on this canvas only, so the app's own UI never sees a client palette. Photo slots are
// tonal blocks marked as placeholders (Correction 3). The canvas is aria-hidden; the card around it
// carries a text summary.
import type { CSSProperties } from "react";
import type { DirectionCard } from "@/lib/kit/types";
import { previewFonts } from "./fonts";

export type PreviewDevice = "phone" | "desktop";

const PHOTO = "Placeholder — owner's photo";

function Photo({ className = "", label = PHOTO }: { className?: string; label?: string }) {
  return (
    <div
      className={`grid min-h-24 place-items-center rounded-md border border-dashed border-[color:var(--p-line)] bg-[var(--p-tint)] p-2 text-center text-sm break-words text-[color:var(--p-text)] ${className}`}
    >
      {label}
    </div>
  );
}

export function Preview({ d, device }: { d: DirectionCard; device: PreviewDevice }) {
  const c = Object.fromEntries(d.colors.map((x) => [x.role, x.hex])) as Record<DirectionCard["colors"][number]["role"], string>;
  const f = previewFonts(d.type.display, d.type.body);
  const phone = device === "phone";
  const vars = {
    "--p-bg": c.bg,
    "--p-surface": c.surface,
    "--p-text": c.text,
    "--p-muted": d.mutedText,
    "--p-accent": c.accent,
    "--p-on-accent": d.onAccent,
    "--p-tint": `color-mix(in srgb, ${c.text} 10%, ${c.surface})`,
    "--p-line": `color-mix(in srgb, ${c.text} 35%, ${c.surface})`,
    "--p-display": f.display,
    "--p-body": f.body,
    colorScheme: d.mode,
  } as CSSProperties;

  const ctas = (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-md bg-[var(--p-accent)] px-3 py-1.5 text-sm font-medium text-[color:var(--p-on-accent)]">{d.preview.ctas[0]}</span>
      <span className="rounded-md border border-[color:var(--p-text)] px-3 py-1.5 text-sm font-medium text-[color:var(--p-text)]">{d.preview.ctas[1]}</span>
    </div>
  );
  const headline = <p className="text-2xl leading-tight text-[color:var(--p-text)] [font-family:var(--p-display)]">{d.headline}</p>;
  const sub = <p className="text-sm text-[color:var(--p-muted)]">[One line of proof from the owner]</p>;
  const copy = <div className="space-y-3">{headline}{sub}{ctas}</div>;

  let hero: React.ReactNode;
  switch (d.heroLayout) {
    case "full-bleed-photo":
      hero = (
        <div>
          <Photo className="min-h-36 place-items-start pt-3" />
          <div className="relative mx-3 -mt-12 space-y-3 rounded-md bg-[var(--p-bg)] p-3">{headline}{ctas}</div>
        </div>
      );
      break;
    case "type-led":
      hero = <div className="space-y-3 py-4">{copy}<Photo className={phone ? "min-h-16" : "min-h-16 max-w-xs"} /></div>;
      break;
    case "card-stack":
      hero = (
        <div className="space-y-3">
          {copy}
          <div className={`grid gap-2 ${phone ? "" : "grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"}`}>
            {d.preview.services.map((s) => (
              <div key={s} className="min-w-0 rounded-md bg-[var(--p-surface)] p-2 text-sm break-words text-[color:var(--p-text)]">{s}<span className="block text-[color:var(--p-muted)]">[price] · Book</span></div>
            ))}
          </div>
        </div>
      );
      break;
    case "before-after":
      hero = (
        <div className={`grid gap-3 ${phone ? "" : "grid-cols-2 items-center"}`}>
          {copy}
          <div className="grid gap-2">
            <Photo className="min-h-16" label={"Before — " + PHOTO.toLowerCase()} />
            <Photo className="min-h-16" label={"After — " + PHOTO.toLowerCase()} />
          </div>
        </div>
      );
      break;
    case "menu-board":
      hero = (
        <div className={`grid gap-3 ${phone ? "" : "grid-cols-2"}`}>
          {copy}
          <ul className="space-y-1 rounded-md bg-[var(--p-surface)] p-3 text-sm text-[color:var(--p-text)]">
            {d.preview.services.map((s) => <li key={s} className="flex justify-between gap-2"><span>{s}</span><span>[price]</span></li>)}
          </ul>
        </div>
      );
      break;
    default:
      hero = <div className={`grid gap-3 ${phone ? "" : "grid-cols-2 items-center"}`}>{copy}<Photo className="min-h-36" /></div>;
  }

  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-line">
      <div
        style={vars}
        className={`${f.className} mx-auto w-full bg-[var(--p-bg)] text-base text-[color:var(--p-text)] [font-family:var(--p-body)] ${phone ? "max-w-[22rem]" : ""}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--p-line)] px-3 py-2">
          <span className="text-lg [font-family:var(--p-display)]">{d.preview.business}</span>
          <span className="rounded-full bg-[var(--p-accent)] px-3 py-1 text-sm text-[color:var(--p-on-accent)]">Tap to call</span>
        </div>
        <div className="space-y-4 p-3">
          {hero}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-y border-[color:var(--p-line)] py-2 text-sm text-[color:var(--p-muted)]">
            {d.preview.trust.map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className={`grid gap-2 ${phone ? "" : "grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]"}`}>
            {d.preview.services.map((s) => (
              <div key={s} className="min-w-0 rounded-md bg-[var(--p-surface)] p-3 break-words">
                <span className="block [font-family:var(--p-display)]">{s}</span>
                <span className="block text-sm text-[color:var(--p-muted)]">[One plain sentence]</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[var(--p-surface)] px-3 py-2 text-sm text-[color:var(--p-muted)]">Demo site — not affiliated with {d.preview.business}.</div>
      </div>
    </div>
  );
}

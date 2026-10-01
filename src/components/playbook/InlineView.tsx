import type { Inline } from "@/content/types";
import { Chip, type ChipVariant } from "@/components/ui/Chip";

export function chipVariant(tone: string): ChipVariant {
  if (tone === "a") return "tier-a";
  if (tone === "b") return "tier-b";
  if (tone === "c") return "tier-c";
  if (tone === "hot") return "hot";
  return "plain";
}

export function InlineView({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (typeof p === "string") return p;
        if ("strong" in p) return <strong key={i}><InlineView parts={p.strong} /></strong>;
        if ("em" in p) return <em key={i}><InlineView parts={p.em} /></em>;
        if ("mono" in p) return <span key={i} className="rounded bg-head/8 px-1 text-fg">{p.mono}</span>;
        if ("chip" in p) return <Chip key={i} variant={chipVariant(p.chip.tone)}>{p.chip.text}</Chip>;
        return <a key={i} href={p.link.href}><InlineView parts={p.link.children} /></a>;
      })}
    </>
  );
}

export type ChipVariant = "tier-a" | "tier-b" | "tier-c" | "hot" | "warm" | "skip" | "plain";

// Status is carried by fill and weight, never by hue. Hot is the one Electric Blue element:
// a ring and dot, because Electric Blue as a fill fails AA with small text.
const styles: Record<ChipVariant, string> = {
  "tier-a": "bg-fill text-on-fill border border-fill",
  "tier-b": "bg-transparent text-head border-2 border-head",
  "tier-c": "bg-transparent text-fg/70 border border-fg/60",
  hot: "bg-transparent text-head border-2 border-accent",
  warm: "bg-transparent text-head border border-head",
  skip: "bg-fg/10 text-fg/70 border border-transparent",
  plain: "bg-surface text-fg border border-line",
};

export function Chip({ variant = "plain", children }: { variant?: ChipVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-0.5 text-sm font-medium ${styles[variant]}`}>
      {variant === "hot" && <span aria-hidden className="size-2 rounded-full bg-accent" />}
      {children}
    </span>
  );
}

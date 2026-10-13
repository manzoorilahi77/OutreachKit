export type ChipVariant = "tier-a" | "tier-b" | "tier-c" | "hot" | "warm" | "skip" | "plain";

// Status is carried by fill and weight, never by hue. Hot is the one Electric Blue element:
// a ring and dot, because Electric Blue as a fill fails AA with small text.
//
// A chip that borrows `head` for its text or border (tier-b, warm, hot) goes invisible on a navy
// `bg-fill` background — the selected state of a `group` toggle button such as the category cards.
// The group-aria-pressed/group-aria-selected overrides swap it to the on-fill token in that case;
// an ordinary chip outside a pressed group is unaffected.
const ON_FILL = "group-aria-pressed:text-on-fill group-aria-pressed:border-on-fill group-aria-selected:text-on-fill group-aria-selected:border-on-fill";
const styles: Record<ChipVariant, string> = {
  "tier-a": "bg-fill text-on-fill border border-fill",
  "tier-b": `bg-transparent text-head border-2 border-head ${ON_FILL}`,
  "tier-c": "bg-transparent text-fg/70 border border-fg/60",
  hot: `bg-transparent text-head border-2 border-accent ${ON_FILL}`,
  warm: `bg-transparent text-head border border-head ${ON_FILL}`,
  skip: "bg-fg/8 text-fg/80 border border-transparent",
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

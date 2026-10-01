// Callouts are told apart by border weight and fill, not colour.
type Tone = "plain" | "quiet" | "firm";

const tones: Record<Tone, string> = {
  plain: "border-l-4 border-head bg-surface",
  quiet: "border border-line bg-transparent",
  firm: "border-2 border-head bg-transparent",
};

export function Note({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) {
  return <div className={`rounded-md p-4 ${tones[tone]}`}>{children}</div>;
}

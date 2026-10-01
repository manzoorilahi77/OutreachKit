import { COLS } from "@/data";
import { CopyButton } from "@/components/ui/CopyButton";

export function CopyHeader({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <CopyButton text={COLS.join("\t")} label={label} copiedLabel="Copied — paste into cell A1" />
      <p className="max-w-3xl text-sm text-muted">{COLS.length} columns: {COLS.join(" · ")}</p>
    </div>
  );
}

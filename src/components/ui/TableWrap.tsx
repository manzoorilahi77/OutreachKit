// Tables scroll inside this container, never the page.
export function TableWrap({ label, minWidth = 640, children }: { label: string; minWidth?: number; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative max-w-full overflow-x-auto rounded-lg border border-line"
    >
      <table className="w-full border-collapse text-left text-base" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export const th = "border-b border-line bg-surface px-3 py-2 text-sm";
export const td = "border-b border-line px-3 py-2 align-top";

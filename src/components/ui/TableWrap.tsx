// Tables scroll inside this container, never the page.
export function TableWrap({ label, minWidth = 640, children }: { label: string; minWidth?: number; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative max-w-full overflow-x-auto"
    >
      <table className="w-full border-collapse text-left text-base" style={{ minWidth }}>{children}</table>
    </div>
  );
}

// Minimal: no frame, no header fill. A navy hairline under the muted header, soft hairlines between rows, room to breathe.
export const th = "border-b border-head py-2 pr-4 text-sm font-normal text-muted";
export const td = "border-b border-line/50 py-4 pr-4 align-top";

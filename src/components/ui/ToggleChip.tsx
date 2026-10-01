"use client";

// Filter button. Pressed is shown by fill, not colour.
export function ToggleChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="min-h-11 rounded-full border border-head px-4 text-sm font-medium text-head hover:bg-head/10 aria-pressed:bg-fill aria-pressed:text-on-fill"
    >
      {children}
    </button>
  );
}

"use client";

import { useState } from "react";

// Pressed state is shown by fill, not colour. Used for the desktop/phone choice.
export function Segmented<T extends string>({
  label, options, initial, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  initial: T;
  onChange?: (v: T) => void;
}) {
  const [value, setValue] = useState<T>(initial);
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-md border border-head">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => { setValue(o.value); onChange?.(o.value); }}
          className="min-h-11 px-4 text-base font-medium text-head aria-pressed:bg-fill aria-pressed:text-on-fill"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const control =
  "min-h-11 w-full rounded-md border border-fg/60 bg-bg px-3 text-base text-fg placeholder:text-muted";

export function Field({ label, hint, id, children }: { label: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label mb-1 block text-base">{label}</label>
      {children}
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${control} ${p.className ?? ""}`} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${control} ${p.className ?? ""}`} />;

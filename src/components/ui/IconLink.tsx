import Link from "next/link";

/** A link shown as an icon alone: a 44px target, the name in a tooltip (title) and for screen readers. */
export function IconLink({ href, label, external, children }: { href: string; label: string; external?: boolean; children: React.ReactNode }) {
  const cls = "inline-flex size-11 items-center justify-center rounded-md border border-line text-head hover:border-head hover:bg-head/10";
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" title={label} className={cls}>{children}<span className="sr-only">{label} (opens in a new tab)</span></a>
    : <Link href={href} title={label} className={cls}>{children}<span className="sr-only">{label}</span></Link>;
}

/** A page's own heading inside IT Prospects. */
export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="space-y-2">
      <h1 className="text-4xl leading-tight">{title}</h1>
      {sub && <p className="max-w-3xl text-lg text-muted">{sub}</p>}
      {children}
    </header>
  );
}

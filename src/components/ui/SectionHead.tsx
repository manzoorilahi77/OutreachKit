export function SectionHead({ num, title, sub, id }: { num: string; title: string; sub?: string; id?: string }) {
  return (
    <div className="mb-6 border-b border-line pb-4">
      <span className="block text-base font-medium text-muted tabular-nums">{num}</span>
      <h2 id={id} className="text-3xl leading-tight">{title}</h2>
      {sub && <p className="mt-2 max-w-3xl text-lg text-muted">{sub}</p>}
    </div>
  );
}

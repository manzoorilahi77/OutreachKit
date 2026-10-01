export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <span className="block text-sm text-muted">{label}</span>
      <strong className="block text-3xl leading-tight">{value}</strong>
      {note && <small className="block text-sm text-muted">{note}</small>}
    </div>
  );
}

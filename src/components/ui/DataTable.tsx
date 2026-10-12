"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { paginate, sortRows, type SortDir, type SortValue } from "@/lib/tableSort";

export interface Column<T> {
  id: string;
  label: string;
  /** Present: the column header sorts. Absent: it doesn't (buttons, link lists). */
  sort?: (row: T) => SortValue;
  cell: (row: T) => React.ReactNode;
  /** Extra classes for the cells, such as "tabular-nums" or "whitespace-nowrap". */
  className?: string;
  /** Hide the header text from the eye but keep it for screen readers. */
  srOnlyHeader?: boolean;
}

export const PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * A table with a serial number column (S.No, counting across pages in the current order), sortable column headers and pagination.
 * Click a header to sort ascending, again for descending. Empty values always sort last.
 */
export function DataTable<T>({ label, rows, columns, rowKey, minWidth = 860, defaultSort, pageSize = 25 }: {
  label: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  minWidth?: number;
  defaultSort?: { id: string; dir: SortDir };
  pageSize?: number;
}) {
  const [sort, setSort] = useState<{ id: string; dir: SortDir } | null>(defaultSort ?? null);
  const [size, setSize] = useState<number>(pageSize);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const col = sort ? columns.find((c) => c.id === sort.id) : undefined;
    return sortRows(rows, col?.sort, sort?.dir ?? "asc");
  }, [rows, columns, sort]);
  const view = paginate(sorted, page, size);
  useEffect(() => { if (page !== view.page) setPage(view.page); }, [page, view.page]);

  const toggle = (id: string) => {
    setSort((cur) => (cur?.id === id ? { id, dir: cur.dir === "asc" ? "desc" : "asc" } : { id, dir: "asc" }));
    setPage(1);
  };
  const snoHead = `S.No`;

  return (
    <div className="space-y-3">
      <TableWrap label={label} minWidth={minWidth}>
        <thead>
          <tr>
            <th scope="col" className={`${th} whitespace-nowrap`}>{snoHead}</th>
            {columns.map((c) => {
              const active = sort?.id === c.id;
              return (
                <th key={c.id} scope="col" className={th} aria-sort={c.sort ? (active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none") : undefined}>
                  {c.sort ? (
                    <button type="button" onClick={() => toggle(c.id)} className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-left font-normal text-muted hover:text-head hover:underline">
                      <span className={c.srOnlyHeader ? "sr-only" : ""}>{c.label}</span>
                      <span aria-hidden className="w-3 text-sm leading-none">{active ? (sort!.dir === "asc" ? "▲" : "▼") : ""}</span>
                    </button>
                  ) : (
                    <span className={c.srOnlyHeader ? "sr-only" : ""}>{c.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((r, i) => (
            <tr key={rowKey(r)}>
              <td className={`${td} whitespace-nowrap tabular-nums text-muted`}>{view.from + i}</td>
              {columns.map((c) => <td key={c.id} className={`${td} ${c.className ?? ""}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p role="status" aria-live="polite" className="text-muted">
          {view.total ? `Showing ${view.from}–${view.to} of ${view.total}` : "No rows"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-muted">
            <span>Rows per page</span>
            <span className="w-24"><Select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select></span>
          </label>
          <Button variant="secondary" disabled={view.page <= 1} onClick={() => setPage(view.page - 1)}>Previous</Button>
          <span className="tabular-nums" aria-live="polite">Page {view.page} of {view.pages}</span>
          <Button variant="secondary" disabled={view.page >= view.pages} onClick={() => setPage(view.page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

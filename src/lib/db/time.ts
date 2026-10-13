// The app speaks ISO strings ("2026-10-13T10:23:15.368Z", "2026-10-13"); MySQL holds DATETIME(3) and DATE in UTC.
// The pool runs with dateStrings, so MySQL hands back "2026-10-13 10:23:15.368" and "2026-10-13".

/** ISO timestamp -> DATETIME(3) text. */
export const toDbTime = (iso: string): string => {
  const d = new Date(iso).toISOString();
  return `${d.slice(0, 10)} ${d.slice(11, 23)}`;
};

/** DATETIME(3) text -> ISO timestamp. */
export const fromDbTime = (s: string): string => `${s.slice(0, 10)}T${s.slice(11, 19)}.${(s.slice(20, 23) || "000").padEnd(3, "0")}Z`;

/** A date field: "" and null both become NULL. */
export const toDbDate = (d: string | null | undefined): string | null => (d ? d : null);
export const fromDbDate = (d: string | null): string | null => (d ? d.slice(0, 10) : null);

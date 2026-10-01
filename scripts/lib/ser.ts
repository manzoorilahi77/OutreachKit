const ident = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export const q = (s: string) => JSON.stringify(s);

const WIDTH = 100;

/** Serialises JSON-like data as TypeScript source. Short values stay on one line. */
export function ser(v: unknown, ind: string): string {
  if (typeof v === "string") return q(v);
  if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    const items = v.map((x) => ser(x, ind + "  "));
    const flat = "[" + items.join(", ") + "]";
    if (!flat.includes("\n") && flat.length + ind.length <= WIDTH) return flat;
    return "[\n" + items.map((s) => `${ind}  ${s},`).join("\n") + `\n${ind}]`;
  }
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    const parts = entries.map(([k, x]) => `${ident.test(k) ? k : q(k)}: ${ser(x, ind + "  ")}`);
    const flat = "{ " + parts.join(", ") + " }";
    if (!flat.includes("\n") && flat.length + ind.length <= WIDTH) return flat;
    return "{\n" + parts.map((s) => `${ind}  ${s},`).join("\n") + `\n${ind}}`;
  }
  throw new Error("cannot serialise " + typeof v);
}

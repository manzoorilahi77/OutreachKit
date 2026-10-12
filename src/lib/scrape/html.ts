// A small tolerant HTML reader, so the Maps parser is a pure function of a string and can be tested against saved pages
// without a browser. It understands what selectors.ts uses: tag, .class, #id, [attr], [attr=v], [attr^=v], [attr$=v],
// [attr*=v], descendant and child (>) combinators, and comma lists. It is not a general-purpose DOM.

export interface El {
  tag: string;
  attrs: Record<string, string>;
  children: (El | string)[];
  parent: El | null;
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const TOKEN = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>|<!doctype[^>]*>/gi;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function parseHtml(html: string): El {
  const root: El = { tag: "#root", attrs: {}, children: [], parent: null };
  const stack: El[] = [root];
  let at = 0;
  const top = () => stack[stack.length - 1]!;
  const text = (s: string) => {
    if (s) top().children.push(decodeEntities(s));
  };
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(html); m; m = TOKEN.exec(html)) {
    text(html.slice(at, m.index));
    at = TOKEN.lastIndex;
    if (m[1]) {
      const name = m[1].toLowerCase();
      const i = stack.map((e) => e.tag).lastIndexOf(name);
      if (i > 0) stack.length = i;
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? "").matchAll(ATTR)) attrs[a[1]!.toLowerCase()] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
      const el: El = { tag, attrs, children: [], parent: top() };
      top().children.push(el);
      if (RAW.has(tag) && !m[4]) {
        const end = html.toLowerCase().indexOf("</" + tag, at);
        const stop = end < 0 ? html.length : end;
        at = stop;
        TOKEN.lastIndex = stop;
      } else if (!VOID.has(tag) && !m[4]) stack.push(el);
    }
  }
  text(html.slice(at));
  return root;
}

/** The visible text of an element, whitespace collapsed. */
export function textOf(el: El): string {
  const out: string[] = [];
  const walk = (e: El) => {
    for (const c of e.children) {
      if (typeof c === "string") out.push(c);
      else if (!RAW.has(c.tag)) walk(c);
    }
  };
  walk(el);
  return out.join("").replace(/\s+/g, " ").trim();
}

// ---- selectors
interface AttrTest { name: string; op: "" | "=" | "^=" | "$=" | "*="; value: string }
interface Compound { tag: string; classes: string[]; id: string; attrs: AttrTest[]; child: boolean }

const COMPOUND = /([a-zA-Z][\w-]*)?((?:[.#][\w-]+|\[[^\]]+\])*)/y;
const PART = /([.#])([\w-]+)|\[\s*([\w:-]+)\s*(?:(\^=|\$=|\*=|=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*)))?\s*\]/g;

function parseSelector(sel: string): Compound[][] {
  return sel.split(/,(?![^[]*\])/).map((one) => {
    const chain: Compound[] = [];
    let child = false;
    for (const tok of one.trim().match(/>|(?:[^\s>[]|\[[^\]]*\])+/g) ?? []) {
      if (tok === ">") { child = true; continue; }
      COMPOUND.lastIndex = 0;
      const m = COMPOUND.exec(tok);
      if (!m || m[0] !== tok) throw new Error(`Unsupported selector: ${sel}`);
      const c: Compound = { tag: (m[1] ?? "").toLowerCase(), classes: [], id: "", attrs: [], child };
      for (const p of (m[2] ?? "").matchAll(PART)) {
        if (p[1] === ".") c.classes.push(p[2]!);
        else if (p[1] === "#") c.id = p[2]!;
        else c.attrs.push({ name: p[3]!.toLowerCase(), op: (p[4] ?? "") as AttrTest["op"], value: p[5] ?? p[6] ?? p[7] ?? "" });
      }
      chain.push(c);
      child = false;
    }
    return chain;
  });
}

function matchesCompound(el: El, c: Compound): boolean {
  if (c.tag && el.tag !== c.tag) return false;
  if (c.id && el.attrs.id !== c.id) return false;
  if (c.classes.length) {
    const have = (el.attrs.class ?? "").split(/\s+/);
    if (!c.classes.every((k) => have.includes(k))) return false;
  }
  return c.attrs.every((a) => {
    const v = el.attrs[a.name];
    if (v === undefined) return false;
    switch (a.op) {
      case "": return true;
      case "=": return v === a.value;
      case "^=": return v.startsWith(a.value);
      case "$=": return v.endsWith(a.value);
      case "*=": return v.includes(a.value);
    }
  });
}

function matchesChain(el: El, chain: Compound[], i: number): boolean {
  const c = chain[i]!;
  if (!matchesCompound(el, c)) return false;
  if (i === 0) return true;
  if (c.child) return !!el.parent && el.parent.tag !== "#root" && matchesChain(el.parent, chain, i - 1);
  for (let p = el.parent; p && p.tag !== "#root"; p = p.parent) if (matchesChain(p, chain, i - 1)) return true;
  return false;
}

/** Every element under `root` (document order) that matches the selector. */
export function selectAll(root: El, selector: string): El[] {
  const chains = parseSelector(selector);
  const out: El[] = [];
  const walk = (e: El) => {
    for (const c of e.children) {
      if (typeof c === "string") continue;
      if (chains.some((ch) => matchesChain(c, ch, ch.length - 1))) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

export const selectOne = (root: El, selector: string): El | null => selectAll(root, selector)[0] ?? null;

// Runs inside the browser against the static (script-free) original page and turns the
// prose into the block schema in src/content/types.ts. Self-contained: no imports.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function walkDocument(): any {
  const norm = (s: string) => s.replace(/[ \t\r\n\f]+/g, " ");
  const fail = (el: Element, why: string): never => {
    throw new Error(`${why}: ${el.outerHTML.slice(0, 160)}`);
  };
  const cls = (el: Element, c: string) => el.classList.contains(c);
  const isMuted = (el: Element) => /var\(--muted\)/.test(el.getAttribute("style") ?? "");

  function inline(node: Node): any[] {
    const out: any[] = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        out.push(norm(n.textContent ?? ""));
        return;
      }
      if (n.nodeType !== 1) return;
      const e = n as Element;
      const tag = e.tagName.toLowerCase();
      if (tag === "b" || tag === "strong") out.push({ strong: inline(e) });
      else if (tag === "i" || tag === "em") out.push({ em: inline(e) });
      else if (tag === "span" && cls(e, "mono")) out.push({ mono: norm(e.textContent ?? "") });
      else if (tag === "span" && cls(e, "chip"))
        out.push({ chip: { tone: [...e.classList].filter((c) => c !== "chip").join(" "), text: norm(e.textContent ?? "") } });
      else if (tag === "a") out.push({ link: { href: e.getAttribute("href") ?? "", children: inline(e) } });
      else if (tag === "span") out.push(...inline(e));
      else fail(e, "unhandled inline element");
    });
    return trimInline(merge(out));
  }
  function merge(parts: any[]): any[] {
    const out: any[] = [];
    for (const p of parts) {
      if (typeof p === "string" && typeof out[out.length - 1] === "string") out[out.length - 1] += p;
      else out.push(p);
    }
    return out;
  }
  function trimInline(parts: any[]): any[] {
    if (typeof parts[0] === "string") parts[0] = parts[0].replace(/^ +/, "");
    const l = parts.length - 1;
    if (typeof parts[l] === "string") parts[l] = parts[l].replace(/ +$/, "");
    return parts.filter((p) => p !== "");
  }
  const text = (el: Element) => norm(el.textContent ?? "").trim();

  function cell(td: Element) {
    const kind = cls(td, "name") ? "name" : cls(td, "n") ? "n" : cls(td, "mono") ? "mono" : undefined;
    return kind ? { kind, inline: inline(td) } : { inline: inline(td) };
  }

  function table(t: Element) {
    return {
      type: "table",
      head: [...t.querySelectorAll("thead th")].map((th) => inline(th)),
      rows: [...t.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(cell)),
    };
  }

  function blocks(parent: Element): any[] {
    const out: any[] = [];
    for (const el of [...parent.children]) {
      const tag = el.tagName.toLowerCase();
      if (tag === "p") {
        const variant = cls(el, "sub") ? "sub" : isMuted(el) ? "fine" : undefined;
        out.push(variant ? { type: "p", inline: inline(el), variant } : { type: "p", inline: inline(el) });
      } else if (tag === "h3" || tag === "h4") out.push({ type: tag, inline: inline(el) });
      else if (tag === "ul" || tag === "ol")
        out.push({ type: "list", ordered: tag === "ol", items: [...el.children].map((li) => inline(li)) });
      else if (tag === "div") out.push(...div(el));
      else fail(el, "unhandled block element");
    }
    return out;
  }

  function div(el: Element): any[] {
    if (cls(el, "grid2") || cls(el, "grid3")) {
      const kids = [...el.children];
      if (kids.every((k) => cls(k, "stat")))
        return [
          {
            type: "stats",
            items: kids.map((k) => ({
              label: text(k.querySelector("span")!),
              value: text(k.querySelector("b")!),
              note: text(k.querySelector("small")!),
            })),
          },
        ];
      if (!kids.every((k) => cls(k, "card"))) fail(el, "grid with non-card child");
      return [{ type: "cards", cols: cls(el, "grid2") ? 2 : 3, cards: kids.map((k) => cardBlocks(k)) }];
    }
    if (cls(el, "card")) {
      if (el.querySelector(".verdict")) {
        const fine = el.querySelector(":scope > p")!;
        return [{ type: "scorerVerdict", fine: inline(fine) }];
      }
      return [{ type: "card", blocks: cardBlocks(el) }];
    }
    if (cls(el, "note"))
      return [{ type: "note", tone: cls(el, "cool") ? "cool" : cls(el, "warn") ? "warn" : "plain", inline: inline(el) }];
    if (cls(el, "tbl-wrap")) {
      if (el.querySelector("#boardTbl")) return [{ type: "widget", id: "board" }];
      return [table(el.querySelector("table")!)];
    }
    if (cls(el, "blue"))
      return [
        {
          type: "steps",
          items: [...el.children].map((r) => ({ n: text(r.querySelector(".bn")!), inline: inline(r.querySelector(".bt")!) })),
        },
      ];
    if (cls(el, "timeline"))
      return [
        {
          type: "timeline",
          items: [...el.children].map((tl) => {
            const what = tl.querySelector(".what")!;
            return { when: text(tl.querySelector(".when")!), title: inline(what.querySelector("b")!), text: inline(what.querySelector("span")!) };
          }),
        },
      ];
    if (cls(el, "tick")) {
      const kids = [...el.children];
      const items = [];
      for (let i = 0; i < kids.length; i += 2) items.push({ mark: text(kids[i]!), inline: inline(kids[i + 1]!) });
      return [{ type: "ticks", items }];
    }
    if (el.children.length === 1 && el.children[0]!.id === "copyHeader")
      return [{ type: "widget", id: "copyHeader", label: text(el.children[0]!) }];
    if (cls(el, "scorer")) return [{ type: "widget", id: "scorer" }];
    if (cls(el, "filters")) return []; // board filters: part of the board widget
    if (cls(el, "console")) return [{ type: "widget", id: "console" }];
    if (!el.className && el.children.length === 1 && el.children[0]!.classList.contains("chip"))
      return [{ type: "chips", items: [{ tone: [...el.children[0]!.classList].filter((c) => c !== "chip").join(" "), text: text(el.children[0]!) }] }];
    return fail(el, "unhandled div");
  }

  function cardBlocks(card: Element): any[] {
    return blocks(card);
  }

  function section(s: Element) {
    const head = s.querySelector(":scope > .head")!;
    const rest = document.createElement("div");
    [...s.children].filter((c) => c !== head).forEach((c) => rest.appendChild(c.cloneNode(true)));
    const result: any[] = [];
    for (const b of blocks(rest)) {
      if (b.type === "p" && b.inline.length === 0) continue;
      result.push(b);
    }
    // the board section's count line is filled by script
    return {
      id: s.id,
      num: text(head.querySelector(".num")!),
      title: text(head.querySelector("h2")!),
      sub: text(head.querySelector(".sub")!),
      blocks: result.filter((b, i, a) => !(b.type === "widget" && b.id === "board" && a.findIndex((x) => x.type === "widget" && x.id === "board") !== i)),
    };
  }

  function consoleContent() {
    const c = document.querySelector(".console")!;
    const steps = [...c.querySelectorAll(":scope > .step")].map((st) => {
      const h = st.querySelector(".step-h")!;
      const items: any[] = [];
      for (const k of [...st.children].filter((x) => x !== h)) {
        if (k.id === "kitFamFilters") items.push({ widget: "kitFilters" });
        else if (k.id === "catGrid") items.push({ widget: "catGrid" });
        else if (cls(k, "dev-grid"))
          items.push({
            devs: [...k.querySelectorAll("button.dev")].map((b) => ({
              dev: b.getAttribute("data-dev")!, pick: text(b.querySelector(".pick em")!), title: text(b.querySelector("strong")!), p: text(b.querySelector("p")!),
            })),
          });
        else if (cls(k, "note")) items.push({ note: { tone: cls(k, "warn") ? "warn" : cls(k, "cool") ? "cool" : "plain", inline: inline(k) } });
        else if (cls(k, "selects"))
          items.push({
            fields: [...k.querySelectorAll("label.fld")].map((l) => {
              const ctl = l.querySelector("select, input")!;
              return { id: ctl.id, label: text(l.querySelector("span")!), kind: ctl.tagName.toLowerCase() === "select" ? "select" : "input", placeholder: ctl.getAttribute("placeholder") ?? "" };
            }),
          });
        else if (k.tagName === "P") items.push({ p: inline(k) });
        else fail(k, "unhandled console item");
      }
      return { k: text(h.querySelector(".k")!), title: text(h.querySelector("h3")!), hint: text(h.querySelector(".hint")!), items };
    });
    const bar = c.querySelector(".console-bar")!;
    const run = c.querySelector(".run")!;
    return {
      bar: text(bar.querySelector("b")!),
      barState: text(bar.querySelector("#consoleState")!),
      steps,
      run: { build: text(run.querySelector("#buildBtn")!), reset: text(run.querySelector("#resetBtn")!), status: text(run.querySelector("#runStatus")!) },
    };
  }

  const mast = document.querySelector("header.mast")!;
  const masthead = {
    tag: text(mast.querySelector(".tag")!),
    title: text(mast.querySelector("h1")!),
    lede: inline(mast.querySelector(".lede")!),
    rules: [...mast.querySelectorAll(".mr")].map((r) => {
      const dd = r.querySelector("dd")!;
      const dyn = dd.id === "mrCats" ? "categories" : dd.id === "mrKits" ? "cities" : null;
      return { label: text(r.querySelector("dt")!), value: dyn ? { dynamic: dyn } : text(dd) };
    }),
    nav: [...document.querySelectorAll("nav.jump a")].map((a) => ({ id: a.getAttribute("href")!.slice(1), label: norm(a.textContent ?? "").trim() })),
  };
  const board = {
    columns: [...document.querySelectorAll("#boardTbl thead th")].map((th) => {
      const sort = th.getAttribute("data-sort");
      return sort ? { sort, label: text(th) } : { label: text(th) };
    }),
  };
  return {
    masthead,
    sections: [...document.querySelectorAll("section")].map(section),
    footer: [...document.querySelectorAll("footer > p")].map((p) => inline(p)),
    board,
    console: consoleContent(),
  };
}

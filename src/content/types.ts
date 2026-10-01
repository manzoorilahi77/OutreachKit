/** Inline content. Plain strings are literal text; every bold tag in the source is `strong` (Jost 500). */
export type Inline =
  | string
  | { strong: Inline[] }
  | { em: Inline[] }
  | { mono: string }
  | { chip: { tone: string; text: string } }
  | { link: { href: string; children: Inline[] } };

export type Block =
  | { type: "p"; inline: Inline[]; variant?: "sub" | "fine" }
  | { type: "h3" | "h4"; inline: Inline[] }
  | { type: "note"; tone: "plain" | "cool" | "warn"; inline: Inline[] }
  | { type: "stats"; items: { label: string; value: string; note: string }[] }
  | { type: "cards"; cols: 2 | 3; cards: Block[][] }
  | { type: "card"; blocks: Block[] }
  | { type: "chips"; items: { tone: string; text: string }[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "steps"; items: { n: string; inline: Inline[] }[] }
  | { type: "ticks"; items: { mark: string; inline: Inline[] }[] }
  | { type: "timeline"; items: { when: string; title: Inline[]; text: Inline[] }[] }
  | {
      type: "table";
      head: Inline[][];
      rows: { kind?: "name" | "n" | "mono"; inline: Inline[] }[][];
    }
  | { type: "scorerVerdict"; fine: Inline[] }
  | { type: "widget"; id: "board" | "console" | "scorer" }
  | { type: "widget"; id: "copyHeader"; label: string };

export interface Section {
  id: string;
  num: string;
  title: string;
  sub: string;
  blocks: Block[];
}

export interface Masthead {
  tag: string;
  title: string;
  lede: Inline[];
  /** `dynamic` entries are filled from the data files (category and city counts). */
  rules: { label: string; value: string | { dynamic: "categories" | "cities" } }[];
  nav: { id: string; label: string }[];
}

export interface BoardContent {
  columns: { sort?: string; label: string }[];
}

export interface ConsoleStep {
  k: string;
  title: string;
  hint: string;
  items: (
    | { widget: "kitFilters" | "catGrid" }
    | { devs: { dev: string; pick: string; title: string; p: string }[] }
    | { note: { tone: "plain" | "cool" | "warn"; inline: Inline[] } }
    | { fields: { id: string; label: string; kind: "select" | "input"; placeholder: string }[] }
    | { p: Inline[] }
  )[];
}

export interface ConsoleContent {
  bar: string;
  barState: string;
  steps: ConsoleStep[];
  run: { build: string; reset: string; status: string };
}

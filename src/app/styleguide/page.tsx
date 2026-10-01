import type { Metadata } from "next";
import { BRAND, LOGOS, type BrandKey, type LogoKind } from "@/lib/brand";
import { ratio, tint } from "@/lib/contrast";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipVariant } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatTile } from "@/components/ui/StatTile";
import { Note } from "@/components/ui/Note";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { SectionHead } from "@/components/ui/SectionHead";
import { Field, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { AlertIcon, CheckIcon, CopyIcon, MoonIcon, SunIcon } from "@/components/ui/Icons";

export const metadata: Metadata = { title: "Styleguide" };

const keys = Object.keys(BRAND) as BrandKey[];
const swatch: Record<BrandKey, string> = {
  navy: "bg-navy text-warm",
  charcoal: "bg-charcoal text-warm",
  warm: "bg-warm text-navy",
  electric: "bg-electric text-warm",
};
const N = BRAND.navy.hex, C = BRAND.charcoal.hex, W = BRAND.warm.hex, E = BRAND.electric.hex;

// Text pairs the app actually uses. AA needs 4.5 for body text, 3 for large text and UI shapes.
const pairs: { use: string; fg: string; bg: string; need: number }[] = [
  { use: "Body text on page (light)", fg: C, bg: W, need: 4.5 },
  { use: "Headings and links on page (light)", fg: N, bg: W, need: 4.5 },
  { use: "Muted text, charcoal 72% on page (light)", fg: tint(C, W, 0.72), bg: W, need: 4.5 },
  { use: "Text on navy fill", fg: W, bg: N, need: 4.5 },
  { use: "Body text on page (dark)", fg: W, bg: N, need: 4.5 },
  { use: "Muted text, warm white 72% on navy (dark)", fg: tint(W, N, 0.72), bg: N, need: 4.5 },
  { use: "Electric Blue as small text on warm white", fg: E, bg: W, need: 4.5 },
  { use: "Electric Blue ring or focus outline on warm white", fg: E, bg: W, need: 3 },
  { use: "Electric Blue ring or focus outline on navy", fg: E, bg: N, need: 3 },
];

const chips: { v: ChipVariant; label: string; rule: string }[] = [
  { v: "tier-a", label: "Tier A", rule: "Solid fill" },
  { v: "tier-b", label: "Tier B", rule: "Outline" },
  { v: "tier-c", label: "Tier C", rule: "Reduced opacity" },
  { v: "hot", label: "Hot", rule: "The one Electric Blue chip" },
  { v: "warm", label: "Warm", rule: "Outline" },
  { v: "skip", label: "Skip", rule: "Muted" },
];

const scale = [
  { cls: "text-4xl", name: "Display", spec: "40px · 500" },
  { cls: "text-3xl", name: "Section heading", spec: "34px · 500" },
  { cls: "text-2xl", name: "Card heading", spec: "27px · 500" },
  { cls: "text-xl", name: "Lead paragraph", spec: "23px · 400" },
  { cls: "text-lg", name: "Large body", spec: "20px · 400" },
  { cls: "text-base", name: "Body", spec: "18px · 400" },
  { cls: "text-sm", name: "UI label and table header", spec: "16px · 400 / 500" },
];

const logoRows: { kind: LogoKind; on: "light" | "navy"; use: string; h: number }[] = [
  { kind: "primary-blue", on: "light", use: "Light headers and pages", h: 40 },
  { kind: "wordmark-white", on: "navy", use: "Navy surfaces and the app header", h: 36 },
  { kind: "anchor-white", on: "navy", use: "Dark marks, directly on navy", h: 64 },
  { kind: "anchor-blue", on: "light", use: "Light marks", h: 64 },
];

const Block = ({ id, num, title, sub, children }: { id: string; num: string; title: string; sub?: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="mb-14">
    <SectionHead id={id} num={num} title={title} sub={sub} />
    {children}
  </section>
);

export default function Styleguide() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-4xl leading-tight">Styleguide</h1>
      <p className="mb-12 max-w-3xl text-lg text-muted">
        Tokens, type and components for the Famysys Outreach Kit. Use the mode button in the header to see everything in light and dark.
      </p>

      <Block id="colour" num="01" title="Colour" sub="Four colours and opacity tints of them. No other hues, no gradients.">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((k) => {
            const b = BRAND[k];
            return (
              <li key={k} className="overflow-hidden rounded-lg border border-line">
                <div className={`flex h-28 items-end p-3 ${swatch[k]}`}>
                  <strong className="text-lg text-inherit">{b.name}</strong>
                </div>
                <dl className="p-3 text-base">
                  <dt className="text-sm text-muted">{b.role}</dt>
                  <dd className="tabular-nums">{b.hex}</dd>
                </dl>
              </li>
            );
          })}
        </ul>
        <h3 className="mt-8 mb-3 text-xl">Tints</h3>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {[100, 80, 60, 40, 20, 10, 8, 6, 4, 2].map((p) => (
            <div key={p} className="text-center text-sm text-muted">
              <div className="mb-1 h-12 rounded border border-line" style={{ background: `color-mix(in srgb, var(--head) ${p}%, transparent)` }} />
              {p}%
            </div>
          ))}
        </div>
        <Note tone="quiet">
          <p>
            <strong>Electric Blue</strong> is one focal moment per screen and at most 3% of any surface. It is never a background wash and never small text.
            On this page it appears in the Hot chip, the focus outline and nowhere else.
          </p>
        </Note>
      </Block>

      <Block id="contrast" num="02" title="Contrast" sub="Computed from the token values, not eyeballed. A unit test fails if a used pairing drops below its target.">
        <TableWrap label="Contrast pairings">
          <thead>
            <tr><th className={th}>Pairing</th><th className={th}>Ratio</th><th className={th}>Needs</th><th className={th}>Result</th></tr>
          </thead>
          <tbody>
            {pairs.map((p) => {
              const r = ratio(p.fg, p.bg);
              const ok = r >= p.need;
              return (
                <tr key={p.use}>
                  <td className={td}>{p.use}</td>
                  <td className={`${td} tabular-nums`}>{r.toFixed(2)} : 1</td>
                  <td className={`${td} tabular-nums`}>{p.need} : 1</td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5">{ok ? <CheckIcon /> : <AlertIcon />}{ok ? "Passes" : "Not used at this size"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Block>

      <Block id="type" num="03" title="Type" sub="Jost 400 for body, Jost 500 for headings and emphasis. Jost has no bold, so there is none here.">
        <ul className="divide-y divide-line rounded-lg border border-line">
          {scale.map((s) => (
            <li key={s.name} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:justify-between">
              <span className={`${s.cls} ${s.cls === "text-base" || s.cls === "text-sm" || s.cls === "text-lg" || s.cls === "text-xl" ? "" : "font-medium text-head"}`}>
                Ten crews, one phone number
              </span>
              <span className="text-sm text-muted">{s.name} · {s.spec}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl">
          Body copy with an emphasised <strong>phrase set in Jost Medium</strong>. In the ported playbook every <code className="rounded bg-surface px-1 font-sans">&lt;b&gt;</code> becomes <code className="rounded bg-surface px-1 font-sans">&lt;strong&gt;</code> at weight 500.
          Copyable prompts and messages also use Jost.
        </p>
      </Block>

      <Block id="buttons" num="04" title="Buttons and copy">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Save kit</Button>
          <Button variant="secondary">Edit lead</Button>
          <Button variant="ghost">Cancel</Button>
          <Button disabled>Not ready</Button>
          <CopyButton text="Hey Maria, that gate you posted last week is sharp work." label="Copy line" />
        </div>
        <p className="mt-3 text-sm text-muted">
          Copy states are text and icon, never colour. Press the copy button to see Copied. If the browser blocks the clipboard it says so in words.
        </p>
        <div className="mt-4 flex flex-wrap gap-6 text-base">
          <span className="inline-flex items-center gap-2"><CopyIcon /> Copy</span>
          <span className="inline-flex items-center gap-2"><CheckIcon /> Copied</span>
          <span className="inline-flex items-center gap-2"><AlertIcon /> Error</span>
          <span className="inline-flex items-center gap-2"><SunIcon /> Light</span>
          <span className="inline-flex items-center gap-2"><MoonIcon /> Dark</span>
        </div>
      </Block>

      <Block id="chips" num="05" title="Status chips" sub="Weight and fill carry the status. No red, green or gold.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chips.map((c) => (
            <li key={c.v} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
              <Chip variant={c.v}>{c.label}</Chip>
              <span className="text-sm text-muted">{c.rule}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block id="tiles" num="06" title="Stat tiles and notes">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Sample tile" value="00" note="Real figures arrive with the playbook" />
          <StatTile label="Sample tile" value="00 – 00" note="Planning estimate" />
          <StatTile label="Sample tile" value="0 / mo" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Note tone="plain"><strong>Plain note.</strong> A heavier left rule and a light fill.</Note>
          <Note tone="quiet"><strong>Quiet note.</strong> A hairline border, no fill.</Note>
          <Note tone="firm"><strong>Firm note.</strong> A two-pixel border, used for conduct rules.</Note>
        </div>
      </Block>

      <Block id="table" num="07" title="Table" sub="Wide tables scroll inside their own container. The page never scrolls sideways.">
        <TableWrap label="Sample table">
          <thead>
            <tr>
              {["Category", "Family", "Ticket", "Gap", "Score", "Tier"].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr><td className={td}>Sample row</td><td className={td}>Sample</td><td className={td}>$0 – $0</td><td className={td}>00%</td><td className={`${td} tabular-nums`}>00</td><td className={td}><Chip variant="tier-a">A</Chip></td></tr>
            <tr><td className={td}>Sample row</td><td className={td}>Sample</td><td className={td}>$0 – $0</td><td className={td}>00%</td><td className={`${td} tabular-nums`}>00</td><td className={td}><Chip variant="tier-b">B</Chip></td></tr>
            <tr><td className={td}>Sample row</td><td className={td}>Sample</td><td className={td}>$0 – $0</td><td className={td}>00%</td><td className={`${td} tabular-nums`}>00</td><td className={td}><Chip variant="tier-c">C</Chip></td></tr>
          </tbody>
        </TableWrap>
      </Block>

      <Block id="forms" num="08" title="Form controls">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <Field id="sg-name" label="Your name" hint="Used in the messages. You can change it later.">
            <Input id="sg-name" placeholder="Maria Lopez" />
          </Field>
          <Field id="sg-state" label="State">
            <Select id="sg-state" defaultValue="">
              <option value="" disabled>Choose a state</option>
              <option>Sample state</option>
            </Select>
          </Field>
          <div>
            <span className="field-label mb-1 block text-base font-medium text-head">Device</span>
            <Segmented label="Device" initial="desktop" options={[{ value: "desktop", label: "Desktop" }, { value: "phone", label: "Phone" }]} />
          </div>
        </div>
      </Block>

      <Block id="logos" num="09" title="Logos" sub="The brand files, scaled by their native aspect ratio. Clear space on every side equals the anchor-mark width.">
        <div className="grid gap-4 md:grid-cols-2">
          {logoRows.map((r) => (
            <figure key={r.kind} className={`rounded-lg border border-line ${r.on === "navy" ? "bg-navy" : "bg-warm"}`}>
              <div className="flex items-center justify-center">
                <Logo kind={r.kind} height={r.h} clearSpace />
              </div>
              <figcaption className={`border-t px-4 py-2 text-sm ${r.on === "navy" ? "border-warm/30 text-warm" : "border-navy/20 text-navy"}`}>
                {r.use} · aspect {(LOGOS[r.kind].w / LOGOS[r.kind].h).toFixed(4)}
              </figcaption>
            </figure>
          ))}
        </div>
      </Block>
    </div>
  );
}

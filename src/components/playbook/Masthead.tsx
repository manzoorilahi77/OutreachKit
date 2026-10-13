import { REGIONS } from "@/lib/market/regions";
import { MASTHEAD } from "@/content/masthead";
import { ALL_CATS } from "@/lib/kit/categories";
import { InlineView } from "./InlineView";

const counts = {
  categories: String(ALL_CATS.length),
  cities: String(Object.values(REGIONS).reduce((a, s) => a + s[1].split("|").length, 0)),
};

// Navy field. The short Electric Blue rule is this screen's one focal moment.
export function Masthead() {
  return (
    <header className="bg-navy text-warm">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6">
        <span aria-hidden className="mb-5 block h-1 w-12 bg-electric" />
        <p className="text-base text-warm/80">{MASTHEAD.tag}</p>
        <h1 className="mt-1 text-4xl leading-tight text-warm sm:text-5xl">{MASTHEAD.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-warm/90"><InlineView parts={MASTHEAD.lede} /></p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MASTHEAD.rules.map((r) => (
            <div key={r.label} className="border-t border-warm/30 pt-2">
              <dt className="text-sm text-warm/80">{r.label}</dt>
              <dd className="text-xl font-medium text-warm">{typeof r.value === "string" ? r.value : counts[r.value.dynamic]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

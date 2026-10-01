// Ported from the original's sectionPlan and buildPromptText (docs/source/territory-desk.html). Template text is unchanged.
import { BASECOMP, STYLE, TPL } from "@/data";
import type { Archetype } from "@/data";
import { slug } from "./helpers";
import type { KitContext, SectionPlan } from "./types";

export function sectionPlan(A: Archetype): SectionPlan {
  const reuse: SectionPlan["reuse"] = [];
  const build: SectionPlan["build"] = [];
  A.sec.forEach((s, i) => {
    const name = s.split(/[\s—+]/)[0]!.trim();
    const n = String(i + 1).padStart(2, "0");
    const template = BASECOMP[name];
    if (template) reuse.push([n, name, template, s]);
    else build.push([n, name, s]);
  });
  return { reuse, build };
}

export function buildPromptText(X: KitContext): string {
  const A=X.arch, S=STYLE[X.fam]||STYLE.out, plan=sectionPlan(A), uc=6;
  const projSlug=slug(X.city)+"-"+slug(X.cat).slice(0,14);
  return `Goal
Build a production-quality demo marketing website for a real local ${X.cat.toLowerCase()} business in ${X.city}, ${X.st}. ${A.goal} I will show it to the owner in a sales conversation, so it must look finished and be honest about what is real.

Start from my template — do not scaffold a new project
Template repo: ${TPL.repo}
README: ${TPL.readme}

Create the project from it, then stop and report before writing any code:
  gh repo create ${projSlug}-{business-slug} --template manzoorilahi77/base-website
  # or, without gh:
  # git clone --depth 1 ${TPL.repo}.git ${projSlug}-{business-slug}
  # cd ${projSlug}-{business-slug} && rm -rf .git && git init -b main && git add -A && git commit -m "Initial commit from base-website"
  cd ${projSlug}-{business-slug} && pnpm install && pnpm dev

Read CLAUDE.md (symlinked as AGENTS.md) in the repo root first and follow it. Where it contradicts anything below, CLAUDE.md wins — tell me about the conflict rather than silently picking one.
Node 22.x per .nvmrc, pnpm 11.20+, Next.js + TypeScript. Use the existing scripts: pnpm dev, build, start, typecheck, lint, format.

Do not re-create anything the template already owns:
${TPL.owns.map(o=>"- "+o).join("\n")}

The business
- Name: {Business Name}
- Trade: ${X.cat}
- City and primary service area: ${X.city}, ${X.st} — also serving ${X.nearby}
- Their typical job value: ${X.tkt}
- Owner's first name: {Owner}
- Phone: {their published phone}   Email: {their published email}
- Google profile URL: {maps link}   Instagram: {handle}
- Photos I am supplying: {the image files the owner has given me written permission to use — leave blank until then}
- Their offering to feature: {list the services, menu items, programmes or inventory in their own words}
- Hours: {their published hours}

Step 1 — site.config.ts, before touching a single component
Set themeId: '${S[0]}'   // ${S[1]}, ${S[2]} — chosen for this trade
Fill every placeholder token from the business block above:
${TPL.tokens.map(t=>"  "+t).join("\n")}
Then open /style-guide and confirm the theme renders correctly. Only after that, move on to sections.

Conversion model for this category: ${A.l}. Primary call to action "${A.cta[0]}", secondary "${A.cta[1]}". Every section leads back to one of those two and nothing else.

Reuse from the template — adapt the content and copy, do not rebuild these
${plan.reuse.map(r=>"- ["+r[0]+"] "+r[1]+"  ←  src/components/sections/"+r[2]+"\n      "+r[3]).join("\n")}
The FAQ, the contact form and the footer always come from the template. Wire every form in this build through deliverContactForm() rather than adding a new handler.

Build these new section components in src/components/sections/ — match the template's existing file, prop and styling conventions exactly
${plan.build.length?plan.build.map(b=>"- ["+b[0]+"] "+b[1]+"\n      "+b[2]).join("\n"):"- none; this archetype is fully covered by the template's existing sections"}

Specific to this trade — fold these into the sections above
${X.famBp.map(b=>"- "+b).join("\n")}

Routes
The template already provides: ${TPL.routes.join(", ")}.
Add or extend to reach this set:
${A.routes.map(r=>"- "+r).join("\n")}
Keep /style-guide and /demo-shots as they are, noindex, and do not link them from the site navigation.

The ${A.l.toLowerCase()} form — exactly these fields, nothing more
${A.form.map(f=>"- "+f).join("\n")}
Extend the template's existing contact form and its validation rather than writing a second one. Delivery goes through deliverContactForm().

Constraints — do not break these
1. Invent nothing. No fabricated reviews, testimonials, client names, licence numbers, years in business, awards, certifications, insurance details or statistics. Where I have not supplied content, render a visible placeholder such as [REVIEW 1 — pull from Google profile] rather than plausible filler.
2. Never use the prospect's own photos without their written permission. Until I tell you I hold it, every photo slot uses public/placeholder.svg, clearly marked as a placeholder on the page. Once I do, use only the images I supply. No stock photography, no AI-generated photos of work.
3. Render a small line in the footer: "Demo site — not affiliated with {Business Name}." I remove it once they pay.
4. Do not use their logo unless I supply the file. Set the wordmark in type instead.
5. Do not add analytics, tracking pixels, cookie banners or third-party scripts to the demo.
6. No horizontal page scroll at any viewport from 320px up.
${A.con.map((c,i)=>(uc+i+1)+". "+c).join("\n")}
${uc+A.con.length+1}. Do not fork the theme system. If this trade genuinely needs a colour the palette lacks, tell me and propose a different themeId — never hard-code a hex in a component.

Copy direction
- Headline formula: the offering plus the city, plainly. The home page targets the phrase "${X.q0} ${X.city}".
- Tone: ${X.tone}
- Plain English, short sentences, no marketing adjectives, no "we pride ourselves on".
- Every call to action offers the same two options: "${A.cta[0]}" or "${A.cta[1]}".
- Write real FAQ answers for this specific trade. Where a number is required and I have not supplied it, use a bracketed placeholder.

Style
themeId '${S[0]}' — ${S[1]}, ${S[2]}. For reference the palette resolves to bg ${S[3]}, surface ${S[4]}, text ${S[5]}, muted ${S[6]}, accent ${S[7]}, positive ${S[8]}, negative ${S[9]}; type ${S[10]}. The template owns these values — consume them through its tokens, never restate them.
Accent is for calls to action only; positive and negative stay semantic.
Design register for this category: ${A.reg}

Technical requirements
- Mobile-first. Design for a 390px phone held one-handed, then scale up.
- Lighthouse mobile: performance 90+, accessibility 95+. LCP under 2.5s on simulated slow 4G.
- All images through next/image with explicit sizes, priority on the hero only, lazy below the fold.
- Extend the template's JSON-LD to: ${A.schema}.
- Text contrast 4.5:1 minimum, visible :focus-visible rings, real alt text, one h1 per route, prefers-reduced-motion respected.

Done when
- pnpm typecheck, pnpm lint and pnpm build all pass clean, and pnpm dev runs with no console errors or hydration warnings.
- Changing site.config.ts alone swaps the business name, city, phone, hours and theme everywhere, with no component edits.
- /style-guide renders the chosen theme and /demo-shots renders the new sections.
- Every unsupplied fact renders as a visible bracketed placeholder — searching the built page for "[" finds all of them.
${A.done.map(d=>"- "+d).join("\n")}

Size of the ask
Do not do this in one pass. Four reviewable steps, stop and report after each:
1. Create from the template, pnpm install, read CLAUDE.md, fill site.config.ts including themeId '${S[0]}', confirm /style-guide.
2. Adapt the ${plan.reuse.length} reused template sections to this business, static content only.
3. Build the ${plan.build.length} new section components and wire the ${A.l.toLowerCase()} flow end to end through deliverContactForm().
4. Add the remaining routes, extend the JSON-LD, then a Lighthouse pass and fixes.

Artifacts to deliver
- The working repo, committed, ready to push.
- Screenshots from the existing /demo-shots route at 390px, so I can send one once they reply, without a device.
- A README section listing exactly what I still need from the owner: photos, review text, licence number, offering list, prices, hours.
- Three headline alternatives in a comment at the top of the hero, so I have something to A/B on the call.
- Deployment: set the real domain in site.config.ts, deploy to Vercel. My demo URL pattern is ${X.demoPattern}`;
}
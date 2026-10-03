// The build prompt for a category kit: the v1 text from buildPromptText(X) with the direction folded in.
// Edits, in order: the category's extra sections after the family's "Specific to this trade" list;
// the themeId everywhere the prompt names it (Step 1, Style, Size of the ask), with Style restating the
// direction's combo; and the site type, hero layout and mood at the end of Style.
import { STYLE } from "@/data";
import { buildPromptText } from "@/lib/kit/buildPrompt";
import type { KitContext } from "@/lib/kit/types";
import { heroLabel, modeLabel, resolveDirection, siteTypeLabel } from "./themes";
import type { CategoryKit, DirectionId } from "./types";

const RULE = "The template owns these values — consume them through its tokens, never restate them.";

function replaceOnce(text: string, find: string, by: string): string {
  const i = text.indexOf(find);
  if (i < 0) throw new Error("buildPromptTextV2: v1 text no longer contains: " + find.slice(0, 60));
  return text.slice(0, i) + by + text.slice(i + find.length);
}

export function buildPromptTextV2(X: KitContext, ck: CategoryKit, dir: DirectionId = "b"): string {
  const v1 = buildPromptText(X);
  const S = STYLE[X.fam] || STYLE.out;
  const R = resolveDirection(ck, dir);
  const T = R.theme;
  // Nothing to add: the direction is the family's own combo and the category adds no sections.
  if (T.id === S[0] && ck.pageStructurePlus.length === 0) return v1;

  let out = v1;

  // 1. The category's sections, after the family's list.
  const famList = "Specific to this trade — fold these into the sections above\n" + X.famBp.map((b) => "- " + b).join("\n");
  if (ck.pageStructurePlus.length)
    out = replaceOnce(out, famList, famList + "\n\nSpecific to " + X.cat + " — add these sections\n" +
      ck.pageStructurePlus.map((p) => "- " + p.section + ": " + p.contains + " (" + p.why + ")").join("\n"));

  // 2. The direction's combo. Step 1 and Size name the themeId too, so they follow it.
  out = replaceOnce(out, `Set themeId: '${S[0]}'   // ${S[1]}, ${S[2]} — chosen for this trade`,
    `Set themeId: '${T.id}'   // ${T.name}, ${modeLabel(T)} — Direction ${dir.toUpperCase()}, ${R.direction.name}`);
  out = replaceOnce(out, `fill site.config.ts including themeId '${S[0]}'`, `fill site.config.ts including themeId '${T.id}'`);
  const oldStyle = `themeId '${S[0]}' — ${S[1]}, ${S[2]}. For reference the palette resolves to bg ${S[3]}, surface ${S[4]}, text ${S[5]}, muted ${S[6]}, accent ${S[7]}, positive ${S[8]}, negative ${S[9]}; type ${S[10]}. ${RULE}`;
  const newStyle = `themeId '${T.id}' — ${T.name}, ${modeLabel(T)}. For reference the palette resolves to bg ${T.bg}, surface ${T.surface}, text ${T.text}, muted ${T.muted}, accent ${T.accent}, positive ${T.positive}, negative ${T.negative}; type ${R.type.id} ${R.type.name} (${R.type.fonts}). ${RULE}`;
  out = replaceOnce(out, oldStyle, newStyle);

  // 3. Site type, hero and mood, at the end of Style.
  const styleEnd = `Design register for this category: ${X.arch.reg}`;
  out = replaceOnce(out, styleEnd, styleEnd +
    `\nSite type: ${siteTypeLabel(R.direction.siteType).toLowerCase()} (Direction ${dir.toUpperCase()}, ${R.direction.name}, the ${R.direction.pairsWithTier} tier).` +
    `\nHero: adapt the template's Hero to a ${heroLabel(R.direction.heroLayout)} composition; do not add a second hero component.` +
    `\nMood: ${R.direction.mood.join(", ")}.`);
  return out;
}

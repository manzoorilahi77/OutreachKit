import { SECTIONS } from "@/content/sections";
import type { Section } from "@/content/types";
import { EXTRA_SECTIONS } from "./playbookExt";

/** The ported eleven sections, then the expansion's (mid-size, healthcare, Canada and the UAE, finding IT buyers). */
export const PLAYBOOK: Section[] = [...SECTIONS, ...EXTRA_SECTIONS];

/** Section 04 is the Kit Console, which is the home page. Every other section has its own page under /playbook. */
export const CONSOLE_SECTION = "kitsec";

export const sectionHref = (id: string) => (id === CONSOLE_SECTION ? "/console" : `/playbook/${id}`);

export const findSection = (id: string): Section | undefined => PLAYBOOK.find((s) => s.id === id);

export function neighbours(id: string): { prev: Section | null; next: Section | null } {
  const i = PLAYBOOK.findIndex((s) => s.id === id);
  return { prev: PLAYBOOK[i - 1] ?? null, next: PLAYBOOK[i + 1] ?? null };
}

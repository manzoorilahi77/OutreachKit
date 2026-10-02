import { SECTIONS } from "@/content/sections";
import type { Section } from "@/content/types";

/** Section 04 is the Kit Console, which is the home page. Every other section has its own page under /playbook. */
export const CONSOLE_SECTION = "kitsec";

export const sectionHref = (id: string) => (id === CONSOLE_SECTION ? "/" : `/playbook/${id}`);

export const findSection = (id: string): Section | undefined => SECTIONS.find((s) => s.id === id);

export function neighbours(id: string): { prev: Section | null; next: Section | null } {
  const i = SECTIONS.findIndex((s) => s.id === id);
  return { prev: SECTIONS[i - 1] ?? null, next: SECTIONS[i + 1] ?? null };
}

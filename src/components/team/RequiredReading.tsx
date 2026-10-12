import Link from "next/link";
import { findSection, sectionHref } from "@/lib/playbook";
import { Note } from "@/components/ui/Note";

/** A checklist on a home page until the required playbook sections are read. Renders nothing when there is nothing left. */
export function RequiredReading({ required, reads }: { required: string[]; reads: Record<string, string> }) {
  const left = required.filter((id) => !reads[id] && findSection(id));
  if (!left.length) return null;
  return (
    <Note tone="firm">
      <h2 className="text-xl">Required reading ({required.length - left.length} of {required.length} done)</h2>
      <ul className="mt-2 space-y-1">
        {left.map((id) => {
          const sec = findSection(id)!;
          return <li key={id}><Link href={sectionHref(id)} className="inline-flex min-h-11 items-center">{sec.num} · {sec.title}</Link></li>;
        })}
      </ul>
    </Note>
  );
}

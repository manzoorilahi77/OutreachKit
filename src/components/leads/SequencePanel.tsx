import { Chip } from "@/components/ui/Chip";
import { LogTouch } from "./LogTouch";
import { addDays, SEQUENCE } from "@/lib/leads/sequence";

/** The Day 0/2/5/9/14/45 sequence for one lead, with each step's date. */
export function SequencePanel({ id, firstContact, stepsDone }: { id: string; firstContact: string | null; stepsDone: number }) {
  if (!firstContact) {
    return <p className="text-muted">The sequence starts when you move the lead to Contacted. Day 0 is that day.</p>;
  }
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
      {SEQUENCE.map((s, i) => {
        const done = i < stepsDone;
        const isNext = i === stepsDone;
        return (
          <li key={s.day} className="grid gap-2 bg-surface p-4 sm:grid-cols-[6rem_9rem_1fr_auto] sm:items-center sm:gap-4">
            <span className="font-medium text-muted">Day {s.day}</span>
            <span className="tabular-nums">{addDays(firstContact, s.day)}</span>
            <span><strong>{s.title}</strong></span>
            <span>
              {done && <Chip variant="skip">Done</Chip>}
              {isNext && (i === 0 ? <Chip variant="tier-b">Next</Chip> : <span className="inline-flex flex-wrap items-center gap-2"><Chip variant="tier-b">Next</Chip><LogTouch id={id} channel={s.channel} /></span>)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

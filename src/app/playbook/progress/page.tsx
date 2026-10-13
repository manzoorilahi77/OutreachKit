import type { Metadata } from "next";
import { RequiredForm } from "@/components/playbook/RequiredForm";
import { Chip } from "@/components/ui/Chip";
import { SectionHead } from "@/components/ui/SectionHead";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { PLAYBOOK as SECTIONS } from "@/lib/playbook";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Playbook progress" };

export default async function ProgressPage() {
  const s = await requirePerm("playbook.required");
  const store = storeFor(s);
  const [progress, mine] = await Promise.all([store.playbookProgress(), store.getPlaybook()]);
  const scope = s.perms["playbook.required"].scope;
  const sections = SECTIONS.map((x) => ({ id: x.id, num: x.num, title: x.title }));
  const required = [...new Set(progress.flatMap((p) => p.required))];
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <SectionHead num="Playbook" title="Playbook progress" sub="Mark sections required and see who has read them. A read counts the first time someone opens the section." />
      <RequiredForm sections={sections} required={mine.required} who={scope === "all" ? "everyone" : "your team"} />
      <section className="space-y-3">
        <h2 className="text-2xl">Who has read what</h2>
        {!required.length ? <p className="text-muted">Nothing is marked required yet.</p> : (
          <TableWrap label="Required reading by person" minWidth={560 + required.length * 60}>
            <thead>
              <tr><th scope="col" className={th}>Person</th>{required.map((id) => { const sec = SECTIONS.find((x) => x.id === id); return <th key={id} scope="col" className={th}>{sec?.num ?? id}</th>; })}</tr>
            </thead>
            <tbody>
              {progress.map((p) => (
                <tr key={p.user.username}>
                  <td className={`${td} font-medium`}>{p.user.fullName}<span className="block text-sm text-muted">{ROLE_LABELS[p.user.role]}</span></td>
                  {required.map((id) => (
                    <td key={id} className={td}>
                      {!p.required.includes(id) ? <span className="text-muted">—</span> : p.reads[id] ? <Chip variant="tier-a">Read</Chip> : <Chip variant="plain">Not yet</Chip>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>
    </div>
  );
}

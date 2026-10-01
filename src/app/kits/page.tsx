import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteKit } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { SectionHead } from "@/components/ui/SectionHead";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { createClient, getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved kits" };

export default async function KitsPage() {
  if (!(await getSession())) redirect("/login?next=/kits");
  const { data: kits } = await (await createClient()).from("kits").select("*").order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <SectionHead num="Account" title="Saved kits" sub="Each one is rebuilt from the playbook data when you open it, using your current details." />
      {!kits?.length ? (
        <p>No saved kits yet. Build one in <Link href="/#kitsec">the kit console</Link> and choose Save this kit.</p>
      ) : (
        <TableWrap label="Saved kits">
          <thead>
            <tr>{["Category", "Where", "Device", "Saved", ""].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {kits.map((k) => (
              <tr key={k.id}>
                <td className={`${td} font-medium text-head`}>{k.category}</td>
                <td className={td}>{k.city}, {k.state}</td>
                <td className={td}>{k.device === "mobile" ? "Phone" : "Desktop"}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{new Date(k.created_at).toLocaleDateString("en-US")}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/kits/${k.id}`} className="inline-flex min-h-11 items-center">Open</Link>
                    <form action={deleteKit}>
                      <input type="hidden" name="id" value={k.id} />
                      <Button variant="ghost" type="submit" aria-label={`Delete ${k.category} in ${k.city}`}>Delete</Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { AuditTable } from "@/components/admin/AuditTable";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Audit" };

export default async function PlatformAudit() {
  const s = await requirePerm("content.approve");
  const store = storeFor(s);
  const [entries, dir] = await Promise.all([store.listAudit(500), store.directory()]);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Platform" title="Audit" sub="Account changes, hand-offs and exports from every person's audit file, newest first. Passwords are never logged." />
      <AuditTable entries={entries} names={new Map(dir.map((d) => [d.username, d.fullName]))} />
    </div>
  );
}

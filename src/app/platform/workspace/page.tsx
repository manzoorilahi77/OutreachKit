import type { Metadata } from "next";
import { WorkspaceForm } from "@/components/admin/WorkspaceForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Workspace details" };

export default async function PlatformWorkspace() {
  const s = await requirePerm("content.approve");
  const ws = await storeFor(s).getWorkspace();
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Platform" title="Workspace details" sub="Studio, demo domain and based line, used in every kit." />
      <WorkspaceForm ws={ws} />
    </div>
  );
}

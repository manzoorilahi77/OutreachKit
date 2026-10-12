import type { Metadata } from "next";
import { WorkspaceForm } from "@/components/admin/WorkspaceForm";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm, storeFor } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings() {
  const s = await requirePerm("workspace.manage");
  const ws = await storeFor(s).getWorkspace();
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Admin" title="Settings" sub="The company details used in every kit. Everyone gets them at their next sync; nobody types them in again." />
      <WorkspaceForm ws={ws} />
    </div>
  );
}

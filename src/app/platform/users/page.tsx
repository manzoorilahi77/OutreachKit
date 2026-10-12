import type { Metadata } from "next";
import { UsersScreen } from "@/components/admin/UsersScreen";
import { SectionHead } from "@/components/ui/SectionHead";
import { requirePerm } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Users" };

export default async function PlatformUsers() {
  await requirePerm("content.approve");
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Platform" title="Users" sub="You can create and manage every kind of account except another super admin." />
      <UsersScreen />
    </div>
  );
}

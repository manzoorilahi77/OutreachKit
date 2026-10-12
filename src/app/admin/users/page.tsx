import type { Metadata } from "next";
import { UsersScreen } from "@/components/admin/UsersScreen";
import { SectionHead } from "@/components/ui/SectionHead";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsers() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead num="Admin" title="Users" sub="Create accounts, share the login, and manage people below admin. There is no sign-up and no email." />
      <UsersScreen />
    </div>
  );
}

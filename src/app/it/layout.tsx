import { ItTabs } from "@/components/it/ItTabs";
import { Note } from "@/components/ui/Note";
import { can, type PermissionKey } from "@/lib/auth/permissions";
import { IT_OFF_MESSAGE, requireIt } from "@/lib/it/server";

const TABS: [label: string, href: string, perm: PermissionKey][] = [
  ["Overview", "/it", "it.view"],
  ["Prospects", "/it/prospects", "it.view"],
  ["Signals inbox", "/it/signals", "it.add"],
  ["IT finder", "/it/finder", "it.finder"],
  ["Search strings", "/it/search", "it.view"],
];

/** IT Prospects: a separate area beside the local leads. Every page under it also checks its own permission and the switch. */
export default async function ItLayout({ children }: { children: React.ReactNode }) {
  const { s, on } = await requireIt("it.view");
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-4 border-b border-line pb-4">
        <p className="text-base font-medium text-muted">IT Prospects · a separate area for IT buyers, digital agencies and IT firms</p>
        {on && <ItTabs items={TABS.filter(([, , p]) => can(s, p)).map(([label, href]) => ({ label, href }))} />}
      </div>
      {on ? children : <Note tone="firm"><p>{IT_OFF_MESSAGE}</p></Note>}
    </div>
  );
}

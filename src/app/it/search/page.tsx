import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/it/PageHead";
import { SearchStrings } from "@/components/it/SearchStrings";
import { requireIt } from "@/lib/it/server";

export const metadata: Metadata = { title: "Search strings" };

export default async function SearchPage() {
  const { on } = await requireIt("it.view");
  if (!on) return null;
  return (
    <div className="space-y-8">
      <PageHead title="Search strings" sub="Ready-made searches for each kind of buying signal. Open one, read the posts, and paste the good ones into the signals inbox. Write to the hiring manager or founder, never the recruiter.">
        <p><Link href="/it/signals">Go to the signals inbox</Link></p>
      </PageHead>
      <SearchStrings />
    </div>
  );
}

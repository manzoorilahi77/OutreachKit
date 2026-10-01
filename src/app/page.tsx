import Link from "next/link";
import { SectionHead } from "@/components/ui/SectionHead";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <SectionHead
        num="Setup"
        title="Famysys Outreach Kit"
        sub="The playbook, the category board and the field kit are added in the next phases."
      />
      <p>
        <Link href="/styleguide">Open the styleguide</Link>
      </p>
    </div>
  );
}

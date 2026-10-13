import type { Metadata } from "next";
import { ApproveButton } from "@/components/admin/ApproveButton";
import { SectionHead } from "@/components/ui/SectionHead";
import { Chip } from "@/components/ui/Chip";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import { requirePerm, storeFor } from "@/lib/auth/server";
import { kitFiles } from "@/lib/store/contentVersions";

export const metadata: Metadata = { title: "Content review" };

export default async function PlatformContent() {
  const s = await requirePerm("content.approve");
  const approvals = await storeFor(s).listApprovals();
  const files = kitFiles();
  const approved = new Map<string, string>();
  for (const a of approvals) if (a.kind === "category-kit") approved.set(`${a.fileId}@${a.version}`, a.approvedAt.slice(0, 10));
  const done = files.filter((f) => approved.has(`${f.fileId}@${f.version}`)).length;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <SectionHead
        num="Platform"
        title="Content review"
        sub={`${done} of ${files.length} category kits approved. An approval is for one version of a file (a short hash of its contents); if the file changes, it needs approving again. The kit files themselves are never edited here.`}
      />
      <TableWrap label="Category kits" minWidth={760}>
        <thead><tr>{["Category", "File", "Version", "Review status in the file", "Your approval"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {files.map((f) => {
            const on = approved.get(`${f.fileId}@${f.version}`);
            return (
              <tr key={f.fileId}>
                <td className={`${td} font-medium`}>{f.category}</td>
                <td className={td}>{f.fileId}</td>
                <td className={`${td} tabular-nums`}>{f.version}</td>
                <td className={td}>{f.reviewStatus}</td>
                <td className={td}>{on ? <Chip variant="tier-a">Approved {on}</Chip> : <ApproveButton fileId={f.fileId} version={f.version} label={f.category} />}</td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </div>
  );
}

import { InlineView } from "@/components/playbook/InlineView";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import type { Block } from "@/content/types";
import { can } from "@/lib/auth/permissions";
import { getSession, storeFor } from "@/lib/auth/server";
import { liveRatios, formatRatio, MIN_LEADS } from "@/lib/leads/ratios";

type TableBlock = Extract<Block, { type: "table" }>;

const ORDER = ["sourcedToQualified", "contactedToReplied", "repliedToCall", "callToProposal", "proposalToWon"] as const;

/** Who the live ratios are for, from the person's reports scope. */
export const RATIO_WHO = { own: "your", team: "your team's", all: "everyone's", below: "", queue: "", none: "" } as const;

/** Section 09's six ratios: the playbook's planning target next to the live ratio from the stage-change events in the person's scope. */
export async function RatiosTable({ block }: { block: TableBlock }) {
  const session = await getSession();
  let live: ReturnType<typeof liveRatios> | null = null;
  let leadCount = 0;
  const who = session ? RATIO_WHO[session.perms["reports.view"].scope] : "";
  if (session && can(session, "reports.view")) {
    const store = storeFor(session);
    leadCount = (await store.readScope("reports.view")).leads.length;
    live = liveRatios(leadCount >= MIN_LEADS ? await store.stageEvents("reports.view") : [], leadCount);
  }
  return (
    <div className="space-y-2">
      <TableWrap label={`The six ratios: planning target and ${who || "the live"} ratio`} minWidth={420}>
        <thead>
          <tr>
            <th scope="col" className={th}>Ratio</th>
            <th scope="col" className={th}>Planning target</th>
            <th scope="col" className={th}>Live ratio{who ? `, ${who}` : ""}</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, i) => (
            <tr key={i}>
              <td className={`${td} font-medium text-head`}><InlineView parts={r[0]!.inline} /></td>
              <td className={`${td} whitespace-nowrap tabular-nums`}><InlineView parts={r[1]!.inline} /></td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{i === 0 ? "Not tracked" : live ? formatRatio(live[ORDER[i - 1]!]) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {live && leadCount < MIN_LEADS && (
        <p className="text-sm text-muted">
          {who ? who[0]!.toUpperCase() + who.slice(1) : "The"} scope has {leadCount} lead{leadCount === 1 ? "" : "s"}. Live ratios appear at {MIN_LEADS}; before that the targets are the better guide.
        </p>
      )}
    </div>
  );
}

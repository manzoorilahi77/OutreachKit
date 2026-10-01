import Link from "next/link";
import { InlineView } from "@/components/playbook/InlineView";
import { TableWrap, td, th } from "@/components/ui/TableWrap";
import type { Block } from "@/content/types";
import { liveRatios, formatRatio, MIN_LEADS, type StageEvent } from "@/lib/leads/ratios";
import { createClient, getSession } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

type TableBlock = Extract<Block, { type: "table" }>;

/** Reads every row of a query, a page at a time (the API returns at most 1,000 rows per request). */
async function allEvents(): Promise<StageEvent[]> {
  const supabase = await createClient();
  const out: StageEvent[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("lead_events").select("lead_id,to_stage").eq("kind", "stage_change").order("id").range(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

const ORDER = ["sourcedToQualified", "contactedToReplied", "repliedToCall", "callToProposal", "proposalToWon"] as const;

/** Section 09's six ratios: the playbook's planning target next to the rep's live ratio from lead_events. */
export async function RatiosTable({ block }: { block: TableBlock }) {
  const session = supabaseConfigured() ? await getSession() : null;
  let live: ReturnType<typeof liveRatios> | null = null;
  let leadCount = 0;
  if (session) {
    const supabase = await createClient();
    const { count } = await supabase.from("leads").select("id", { count: "exact", head: true });
    leadCount = count ?? 0;
    live = liveRatios(leadCount >= MIN_LEADS ? await allEvents() : [], leadCount);
  }
  return (
    <div className="space-y-2">
      <TableWrap label="The six ratios: planning target and your live ratio" minWidth={420}>
        <thead>
          <tr>
            <th scope="col" className={th}>Ratio</th>
            <th scope="col" className={th}>Planning target</th>
            <th scope="col" className={th}>Your live ratio</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, i) => (
            <tr key={i}>
              <td className={`${td} font-medium text-head`}><InlineView parts={r[0]!.inline} /></td>
              <td className={`${td} whitespace-nowrap tabular-nums`}><InlineView parts={r[1]!.inline} /></td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>
                {i === 0 ? "Not tracked" : !session ? <Link href="/login?next=/%23track">Sign in to see yours</Link> : live ? formatRatio(live[ORDER[i - 1]!]) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      {session && leadCount < MIN_LEADS && (
        <p className="text-sm text-muted">
          You have {leadCount} lead{leadCount === 1 ? "" : "s"}. Your live ratios appear at {MIN_LEADS}; before that the targets are the better guide.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { logTouch } from "@/app/leads/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon } from "@/components/ui/Icons";
import type { Channel } from "@/lib/leads/stages";
import { channelLabel } from "@/lib/leads/stages";
import { localToday } from "./TodayInput";

export function LogTouch({ id, channel }: { id: string; channel: Channel }) {
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => start(async () => { const r = await logTouch(id, channel, localToday()); setErr(r?.ok ? "" : (r?.message ?? "")); })}
      >
        Log it as done ({channelLabel(channel)})
      </Button>
      {err && <span className="flex items-center gap-1" role="alert"><AlertIcon />{err}</span>}
    </span>
  );
}

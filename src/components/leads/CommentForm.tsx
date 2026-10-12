"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { addComment } from "@/app/leads/actions";
import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import { TodayInput } from "./TodayInput";

export function CommentForm({ owner, id }: { owner: string; id: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (p, fd) => {
    const r = await addComment(p, fd);
    if (r?.ok) (document.getElementById("comment-note") as HTMLTextAreaElement | null)?.form?.reset();
    return r;
  }, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="id" value={id} />
      <TodayInput />
      <label htmlFor="comment-note" className="field-label block text-base">Add a comment</label>
      <textarea id="comment-note" name="note" rows={3} required maxLength={1000} className="w-full rounded-md border border-fg/60 bg-bg px-3 py-2 text-base text-fg" />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Comment"}</Button>
      {state && (
        <p className="flex items-start gap-2" role={state.ok ? "status" : "alert"}>
          {state.ok ? <CheckIcon className="mt-1 shrink-0" /> : <AlertIcon className="mt-1 shrink-0" />}<span>{state.message}</span>
        </p>
      )}
    </form>
  );
}

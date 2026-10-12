"use client";

import { useEffect } from "react";
import { markSectionRead } from "@/app/actions";

/** Records a read receipt in the person's own playbook.json when they open a section. Renders nothing. */
export function MarkRead({ id }: { id: string }) {
  useEffect(() => { void markSectionRead(id); }, [id]);
  return null;
}

"use client";

import { useEffect, useState } from "react";

export const localToday = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the rep's own time zone

/** Sends the rep's local date with a form, so "today" is theirs and not the server's. */
export function TodayInput() {
  const [v, setV] = useState("");
  useEffect(() => setV(localToday()), []);
  return <input type="hidden" name="today" value={v} />;
}

import { CHECKS } from "@/data";

/** The ten scorer checks as database columns, in the order of CHECKS (section 05). */
export const CHECK_FIELDS = [
  "check_no_real_website", "check_owner_run", "check_active_30_days", "check_older_3_months", "check_in_radius",
  "check_job_value_fits", "check_reviews_5_to_200", "check_reachable", "check_demand_signal", "check_second_channel",
] as const;
export type CheckField = (typeof CHECK_FIELDS)[number];

export const CHECK_LABELS: { field: CheckField; label: string; hint: string }[] = CHECK_FIELDS.map((field, i) => ({
  field, label: CHECKS[i]![0], hint: CHECKS[i]![1],
}));

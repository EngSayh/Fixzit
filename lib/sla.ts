import { addMinutes } from "date-fns";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const SLA_MINUTES_MAP: Record<WorkOrderPriority, number> = {
  LOW: 72 * 60, // 3 days
  MEDIUM: 36 * 60, // 1.5 days
  HIGH: 12 * 60, // 12 hours
  CRITICAL: 4 * 60, // 4 hours
};

/**
 * Returns the SLA resolution window in minutes for a work order priority.
 * This function is used server side when persisting records and in
 * verification scripts that seed the real Mongo database.
 */
export function computeSlaMinutes(priority: WorkOrderPriority): number {
  return SLA_MINUTES_MAP[priority] ?? SLA_MINUTES_MAP.MEDIUM;
}

/**
 * Calculates the due date for a work order by adding the SLA window to
 * the provided start time. A new Date instance is always returned.
 */
export function computeDueAt(start: Date, slaMinutes: number): Date {
  return addMinutes(start, slaMinutes);
}

/**
 * Convenience helper that returns both the SLA window (minutes) and the
 * computed due date for a work order priority. This keeps controller logic
 * concise and guarantees consistent calculations across the app and QA
 * tooling.
 */
export function resolveSlaTarget(
  priority: WorkOrderPriority,
  start: Date = new Date(),
) {
  const slaMinutes = computeSlaMinutes(priority);
  return {
    slaMinutes,
    dueAt: computeDueAt(start, slaMinutes),
  };
}

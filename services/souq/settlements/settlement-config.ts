/**
 * Shared settlement/payout configuration.
 *
 * Centralizes payout thresholds and scheduling to keep
 * withdrawal validation, payout processing, and batch jobs
 * aligned across services.
 */
export const PAYOUT_CONFIG = {
  minimumAmount: 500, // SAR
  holdPeriodDays: 7, // Days after delivery before withdrawal/payout
  maxRetries: 3,
  retryDelayMinutes: 30,
  batchSchedule: "weekly" as const, // 'weekly' or 'biweekly'
  batchDay: 5, // Friday (0 = Sunday, 6 = Saturday)
  currency: "SAR",
};

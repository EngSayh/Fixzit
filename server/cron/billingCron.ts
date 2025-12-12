// Billing Cron Job
// Runs daily at 2:00 AM to process recurring subscriptions

import cron from "node-cron";
import { runRecurringBillingJob } from "../services/subscriptionBillingService";
import { tapPayments } from "@/lib/finance/tap-payments";
import { logger } from "@/lib/logger";

export function startBillingCron() {
  // Run every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    logger.info("[Cron] Starting daily billing job");
    try {
      const result = await runRecurringBillingJob(tapPayments);
      logger.info("[Cron] Billing job completed", result);
    } catch (error) {
      logger.error("[Cron] Billing job failed", { error });
    }
  });

  logger.info("[Cron] Billing cron job scheduled (daily 2:00 AM)");
}

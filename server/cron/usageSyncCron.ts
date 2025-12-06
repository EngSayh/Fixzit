// Usage Sync Cron Job
// Runs daily at 3:00 AM to sync usage data for all active subscriptions

import cron from "node-cron";
import Subscription from "../models/Subscription";
import { updateUsageSnapshot } from "../services/subscriptionSeatService";
import { connectToDatabase } from "../../lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { WORK_ORDERS_ENTITY_LEGACY } from "@/config/topbar-modules";

async function syncUsageForAllSubscriptions() {
  await connectToDatabase();

  const activeSubs = await Subscription.find({
    status: { $in: ["ACTIVE", "PAST_DUE"] },
  });

  for (const sub of activeSubs) {
    try {
      // In a real implementation, you would fetch actual usage counts from the database
      // For now, just record a sync attempt
      const subscriptionId =
        typeof sub._id === "string" ? sub._id : sub._id.toString();
      await updateUsageSnapshot(subscriptionId, {
        users: 0,
        properties: 0,
        units: 0,
        [WORK_ORDERS_ENTITY_LEGACY]: 0,
      });
    } catch (error) {
      logger.error("[Cron] Usage sync failed for subscription", {
        id: sub._id,
        error,
      });
    }
  }

  logger.info("[Cron] Usage sync completed", { count: activeSubs.length });
}

export function startUsageSyncCron() {
  // Run every day at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    logger.info("[Cron] Starting daily usage sync job");
    try {
      await syncUsageForAllSubscriptions();
    } catch (error) {
      logger.error("[Cron] Usage sync job failed", { error });
    }
  });

  logger.info("[Cron] Usage sync cron job scheduled (daily 3:00 AM)");
}

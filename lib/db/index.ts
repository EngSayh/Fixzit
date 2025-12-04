/**
 * Database index management for MongoDB
 *
 * STRICT v4.1 Multi-Tenancy Compliance:
 * - All unique indexes are org-scoped (e.g., { orgId: 1, email: 1 })
 * - Normalized tenant key naming to `orgId`
 * - MUST stay in sync with lib/db/collections.ts createIndexes()
 */

import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { isTruthy } from "@/lib/utils/env";
import mongoose from "mongoose";
import { createIndexes } from "@/lib/db/collections";
import { WorkOrderComment } from "@/server/models/workorder/WorkOrderComment";
import { WorkOrderAttachment } from "@/server/models/workorder/WorkOrderAttachment";
import { WorkOrderTimeline } from "@/server/models/workorder/WorkOrderTimeline";
import { QaLog } from "@/server/models/qa/QaLog";
import { QaAlert } from "@/server/models/qa/QaAlert";
import { Tenant } from "@/server/models/Tenant";
import { Vendor } from "@/server/models/Vendor";
import { Organization } from "@/server/models/Organization";

/**
 * Ensures core indexes are created on all collections.
 * Should be run during deployment to optimize query performance.
 */
export async function ensureCoreIndexes(): Promise<void> {
  // Skip index creation entirely in offline mode (local dev without MongoDB)
  const offline = isTruthy(process.env.ALLOW_OFFLINE_MONGODB);
  if (offline) {
    logger.info("[indexes] Skipped ensureCoreIndexes – offline mode active");
    return;
  }

  await connectToDatabase();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }

  const failures: Array<{ collection: string; error: Error }> = [];
  try {
    await createIndexes();
  } catch (err) {
    const error = err as Error;
    failures.push({ collection: "canonicalIndexes", error });
    logger.error("Failed to create canonical indexes (lib/db/collections.ts)", {
      error: error.message,
      stack: error.stack,
    });
  }

  // Schema-driven indexes for collections NOT already covered by createIndexes()
  // This prevents IndexOptionsConflict when key specs exist with different names/options.
  const modelIndexTargets = [
    { name: "Tenant", model: Tenant },
    { name: "Vendor", model: Vendor },
    { name: "Organization", model: Organization },
    { name: "WorkOrderComment", model: WorkOrderComment },
    { name: "WorkOrderAttachment", model: WorkOrderAttachment },
    { name: "WorkOrderTimeline", model: WorkOrderTimeline },
    { name: "QaLog", model: QaLog },
    { name: "QaAlert", model: QaAlert },
  ];

  for (const { name, model } of modelIndexTargets) {
    try {
      await model.createIndexes();
    } catch (err) {
      const error = err as Error;
      failures.push({ collection: name, error });
      logger.error(`Failed to create indexes for model ${name}`, {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  if (failures.length > 0) {
    const collectionList = failures.map((f) => f.collection).join(", ");
    throw new Error(`Index creation failed for ${failures.length} collection(s): ${collectionList}`);
  }

  logger.info("Core indexes ensured successfully", {
    source: "lib/db/collections.ts + model-defined indexes",
  });
}

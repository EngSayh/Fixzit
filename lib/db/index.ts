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
import mongoose from "mongoose";
import { createIndexes } from "@/lib/db/collections";
import { User } from "@/server/models/User";
import { Property } from "@/server/models/Property";
import { Invoice } from "@/server/models/Invoice";
import { SupportTicket } from "@/server/models/SupportTicket";
import { HelpArticle } from "@/server/models/HelpArticle";
import { CmsPage } from "@/server/models/CmsPage";
import { WorkOrder } from "@/server/models/WorkOrder";
import { WorkOrderComment } from "@/server/models/workorder/WorkOrderComment";
import { WorkOrderAttachment } from "@/server/models/workorder/WorkOrderAttachment";
import { WorkOrderTimeline } from "@/server/models/workorder/WorkOrderTimeline";

/**
 * Ensures core indexes are created on all collections.
 * Should be run during deployment to optimize query performance.
 */
export async function ensureCoreIndexes(): Promise<void> {
  // Skip index creation in offline mode (local dev without MongoDB)
  if (process.env.ALLOW_OFFLINE_MONGODB === "true" && !mongoose.connection.db) {
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

  // Schema-driven indexes for core models to avoid drift.
  // WorkOrder is included here to ensure text search and all schema indexes are created.
  const modelIndexTargets = [
    { name: "User", model: User },
    { name: "Property", model: Property },
    { name: "Invoice", model: Invoice },
    { name: "SupportTicket", model: SupportTicket },
    { name: "HelpArticle", model: HelpArticle },
    { name: "CmsPage", model: CmsPage },
    { name: "WorkOrder", model: WorkOrder },
    { name: "WorkOrderComment", model: WorkOrderComment },
    { name: "WorkOrderAttachment", model: WorkOrderAttachment },
    { name: "WorkOrderTimeline", model: WorkOrderTimeline },
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

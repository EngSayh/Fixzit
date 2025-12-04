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
import { COLLECTIONS } from "@/lib/db/collections";
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
type IndexSpec = {
  key: Record<string, 1 | -1 | "text">;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  name?: string;
  partialFilterExpression?: Record<string, unknown>;
};

type CollectionIndexes = {
  collection: string;
  indexes: IndexSpec[];
};

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

  // Drop legacy global uniques so org-scoped uniques can be enforced
  await dropLegacyGlobalUniqueIndexes(db);

  // Canonical index definitions (aligned with lib/db/collections.ts)
  const indexes: CollectionIndexes[] = [
    // Users, Properties, Invoices, SupportTickets, HelpArticles, CmsPages are handled via model.createIndexes() below
    // CRITICAL: Collection name is centralized via COLLECTIONS.WORK_ORDERS (lowercase, aligns with Mongoose default)
    {
      collection: COLLECTIONS.WORK_ORDERS,
      indexes: [
        {
          key: { orgId: 1, workOrderNumber: 1 },
          unique: true,
          name: "workorders_orgId_workOrderNumber_unique",
          partialFilterExpression: { orgId: { $exists: true } },
        },
        { key: { orgId: 1 }, name: "workorders_orgId" },
        { key: { orgId: 1, status: 1 }, name: "workorders_orgId_status" },
        { key: { orgId: 1, priority: 1 }, name: "workorders_orgId_priority" },
        { key: { orgId: 1, "location.propertyId": 1 }, name: "workorders_orgId_propertyId" },
        { key: { orgId: 1, "assignment.assignedTo.userId": 1 }, name: "workorders_orgId_assignedUserId" },
        { key: { orgId: 1, "assignment.assignedTo.vendorId": 1 }, name: "workorders_orgId_assignedVendorId" },
        { key: { orgId: 1, createdAt: -1 }, name: "workorders_orgId_createdAt" },
        { key: { orgId: 1, "sla.resolutionDeadline": 1 }, name: "workorders_orgId_slaDeadline" },
        { key: { orgId: 1, status: 1, createdAt: -1 }, name: "workorders_orgId_status_createdAt" },
        { key: { orgId: 1, "location.propertyId": 1, status: 1 }, name: "workorders_orgId_property_status" },
        // FIXED: unit_id was never used - WorkOrder schema uses location.unitNumber (String)
        { key: { orgId: 1, "location.unitNumber": 1, status: 1 }, name: "workorders_orgId_unitNumber_status" },
        { key: { orgId: 1, "recurrence.nextScheduledDate": 1 }, name: "workorders_orgId_nextScheduledDate" },
        { key: { orgId: 1, priority: 1, "sla.status": 1 }, name: "workorders_orgId_priority_slaStatus" },
        {
          key: { orgId: 1, title: "text", description: "text", "work.solutionDescription": "text" },
          name: "workorders_text_search",
        },
        { key: { "sla.resolutionDeadline": 1 }, sparse: true, name: "workorders_slaDeadline_sparse" },
      ],
    },
    {
      collection: COLLECTIONS.PRODUCTS,
      indexes: [
        {
          key: { orgId: 1, sku: 1 },
          unique: true,
          name: "products_orgId_sku_unique",
          partialFilterExpression: { orgId: { $exists: true } },
        },
        { key: { orgId: 1, categoryId: 1 }, name: "products_orgId_categoryId" },
        // ADDED: Missing status index per lib/db/collections.ts
        { key: { orgId: 1, status: 1 }, name: "products_orgId_status" },
        { key: { title: "text", description: "text" }, name: "products_text_search" },
      ],
    },
    {
      collection: COLLECTIONS.ORDERS,
      indexes: [
        {
          key: { orgId: 1, orderNumber: 1 },
          unique: true,
          name: "orders_orgId_orderNumber_unique",
          partialFilterExpression: { orgId: { $exists: true } },
        },
        { key: { orgId: 1, userId: 1 }, name: "orders_orgId_userId" },
        { key: { orgId: 1, status: 1 }, name: "orders_orgId_status" },
        { key: { orgId: 1, createdAt: -1 }, name: "orders_orgId_createdAt" },
      ],
    },
    {
      collection: "qa_logs",
      indexes: [
        { key: { orgId: 1, timestamp: -1 }, sparse: true, name: "qa_logs_orgId_timestamp" },
        { key: { orgId: 1, event: 1, timestamp: -1 }, sparse: true, name: "qa_logs_orgId_event_timestamp" },
        { key: { timestamp: -1 }, name: "qa_logs_timestamp_desc" },
        { key: { event: 1, timestamp: -1 }, name: "qa_logs_event_timestamp" },
        { key: { timestamp: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60, name: "qa_logs_ttl_90d" },
      ],
    },
    {
      collection: "qa_alerts",
      indexes: [
        { key: { orgId: 1, timestamp: -1 }, sparse: true, name: "qa_alerts_orgId_timestamp" },
        { key: { orgId: 1, event: 1, timestamp: -1 }, sparse: true, name: "qa_alerts_orgId_event_timestamp" },
        { key: { timestamp: -1 }, name: "qa_alerts_timestamp_desc" },
        { key: { event: 1, timestamp: -1 }, name: "qa_alerts_event_timestamp" },
        { key: { timestamp: 1 }, expireAfterSeconds: 30 * 24 * 60 * 60, name: "qa_alerts_ttl_30d" },
      ],
    },
  ];

  const failures: Array<{ collection: string; error: Error }> = [];

  for (const { collection, indexes: collIndexes } of indexes) {
    const coll = db.collection(collection);
    for (const indexSpec of collIndexes) {
      try {
        const options: Record<string, unknown> = { background: true };
        if (indexSpec.unique) options.unique = true;
        if (indexSpec.sparse) options.sparse = true;
        if (typeof indexSpec.expireAfterSeconds === "number") {
          options.expireAfterSeconds = indexSpec.expireAfterSeconds;
        }
        if (indexSpec.name) options.name = indexSpec.name;
        if (indexSpec.partialFilterExpression) {
          options.partialFilterExpression = indexSpec.partialFilterExpression;
        }

        await coll.createIndex(indexSpec.key, options);
      } catch (err) {
        const error = err as { code?: number; codeName?: string; message?: string };
        const isDuplicate =
          error?.code === 85 || error?.code === 86 || error?.message?.includes("already exists");
        if (isDuplicate) continue;

        failures.push({ collection, error: error as Error });
        logger.error(`Failed to create index on ${collection}`, {
          index: JSON.stringify(indexSpec.key),
          name: indexSpec.name,
          error: error?.message,
          code: error?.code,
        });
      }
    }
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
    collections: indexes.length,
    totalIndexes: indexes.reduce((sum, c) => sum + c.indexes.length, 0),
  });
}

async function dropLegacyGlobalUniqueIndexes(db: mongoose.mongo.Db) {
  // Drop legacy global uniques from BOTH collection name variants to handle any drift
  const targets: Array<{ collection: string; indexes: string[] }> = [
    { collection: "users", indexes: ["email_1", "username_1", "code_1"] },
    { collection: "properties", indexes: ["code_1"] },
    // CRITICAL: Drop from both naming variants (legacy lowercase and canonical camelCase)
    { collection: "workorders", indexes: ["code_1", "workOrderNumber_1", "unit_id_1"] },
    { collection: "workOrders", indexes: ["code_1", "workOrderNumber_1", "unit_id_1"] },
    { collection: "products", indexes: ["sku_1"] },
    { collection: "orders", indexes: ["orderNumber_1"] },
    { collection: "invoices", indexes: ["code_1", "invoiceNumber_1", "number_1"] },
    { collection: "supporttickets", indexes: ["code_1"] },
    { collection: "helparticles", indexes: ["slug_1"] },
    { collection: "cmspages", indexes: ["slug_1"] },
  ];

  for (const { collection, indexes } of targets) {
    for (const indexName of indexes) {
      try {
        await db.collection(collection).dropIndex(indexName);
      } catch (error) {
        const err = error as { code?: number; codeName?: string; message?: string };
        const isMissing =
          err?.code === 27 ||
          err?.codeName === "IndexNotFound" ||
          err?.message?.includes("index not found");
        if (isMissing) continue;
        logger.warn("[indexes] Failed to drop legacy index", {
          collection,
          indexName,
          error: err?.message,
        });
      }
    }
  }
}

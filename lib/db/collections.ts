import { getDatabase } from "@/lib/mongodb-unified";
import type {
  Tenant,
  User,
  Property,
  WorkOrder,
  Category,
  Vendor,
  Product,
  Cart,
  Order,
  Invoice,
  RFQ,
  Review,
  NotificationDoc,
} from "@/lib/models";
import { validateCollection, sanitizeTimestamps } from "@/lib/utils/timestamp";
import { logger } from "@/lib/logger";

// Collection names
export const COLLECTIONS = {
  TENANTS: "tenants",
  USERS: "users",
  PROPERTIES: "properties",
  WORK_ORDERS: "workorders",
  CATEGORIES: "categories",
  VENDORS: "vendors",
  PRODUCTS: "products",
  CARTS: "carts",
  ORDERS: "orders",
  INVOICES: "invoices",
  RFQS: "rfqs",
  REVIEWS: "reviews",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "auditLogs",
} as const;

// Get typed collections
export async function getCollections() {
  const db = await getDatabase();

  return {
    tenants: db.collection<Tenant>(COLLECTIONS.TENANTS),
    users: db.collection<User>(COLLECTIONS.USERS),
    properties: db.collection<Property>(COLLECTIONS.PROPERTIES),
    workOrders: db.collection<WorkOrder>(COLLECTIONS.WORK_ORDERS),
    categories: db.collection<Category>(COLLECTIONS.CATEGORIES),
    vendors: db.collection<Vendor>(COLLECTIONS.VENDORS),
    products: db.collection<Product>(COLLECTIONS.PRODUCTS),
    carts: db.collection<Cart>(COLLECTIONS.CARTS),
    orders: db.collection<Order>(COLLECTIONS.ORDERS),
    invoices: db.collection<Invoice>(COLLECTIONS.INVOICES),
    rfqs: db.collection<RFQ>(COLLECTIONS.RFQS),
    reviews: db.collection<Review>(COLLECTIONS.REVIEWS),
    notifications: db.collection<NotificationDoc>(COLLECTIONS.NOTIFICATIONS),
  };
}

// Create indexes
// STRICT v4.1: All unique indexes MUST be org-scoped for proper multi-tenancy.
// This prevents cross-tenant collisions (e.g., same email/SKU in different orgs).
export async function createIndexes() {
  const db = await getDatabase();

  // Clean up legacy global unique indexes so org-scoped uniques can be enforced
  await dropLegacyGlobalUniqueIndexes(db);

  await createQaIndexes(db);

  // Users - STRICT v4.1: email unique per org, not globally
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex(
      { orgId: 1, email: 1 },
      {
        unique: true,
        background: true,
        name: "users_orgId_email_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection(COLLECTIONS.USERS).createIndex({ orgId: 1 }, { background: true, name: "users_orgId" });
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ orgId: 1, role: 1 }, { background: true, name: "users_orgId_role" });
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ orgId: 1, "personal.phone": 1 }, { background: true, name: "users_orgId_phone" });

  // Properties - STRICT v4.1: code unique per org
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex(
      { orgId: 1, code: 1 },
      {
        unique: true,
        background: true,
        name: "properties_orgId_code_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection(COLLECTIONS.PROPERTIES).createIndex({ orgId: 1 }, { background: true, name: "properties_orgId" });
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex({ orgId: 1, type: 1 }, { background: true, name: "properties_orgId_type" });
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "properties_orgId_status" });
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex({ orgId: 1, "address.city": 1 }, { background: true, name: "properties_orgId_city" });

  // Work Orders - STRICT v4.1: workOrderNumber unique per org
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, workOrderNumber: 1 },
      {
        unique: true,
        background: true,
        name: "workorders_orgId_workOrderNumber_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "workorders_orgId_status" });
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ orgId: 1, priority: 1 }, { background: true, name: "workorders_orgId_priority" });
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ orgId: 1, "location.propertyId": 1 }, { background: true, name: "workorders_orgId_propertyId" });
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, "location.unitNumber": 1, status: 1 },
      { background: true, name: "workorders_orgId_unitNumber_status" },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, "assignment.assignedTo.userId": 1 },
      { background: true, name: "workorders_orgId_assignedUser" },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, "assignment.assignedTo.vendorId": 1 },
      { background: true, name: "workorders_orgId_assignedVendor" },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ createdAt: -1 }, { background: true, name: "workorders_createdAt_desc" });
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, title: "text", description: "text", "work.solutionDescription": "text" },
      { background: true, name: "workorders_text_search" },
    );

  // Products - STRICT v4.1: sku unique per org
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex(
      { orgId: 1, sku: 1 },
      {
        unique: true,
        background: true,
        name: "products_orgId_sku_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex({ orgId: 1, categoryId: 1 }, { background: true, name: "products_orgId_categoryId" });
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "products_orgId_status" });
  // STRICT v4.1: Text search must be org-scoped to prevent cross-tenant scans
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex(
      { orgId: 1, title: "text", description: "text" },
      {
        background: true,
        name: "products_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Orders - STRICT v4.1: orderNumber unique per org
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex(
      { orgId: 1, orderNumber: 1 },
      {
        unique: true,
        background: true,
        name: "orders_orgId_orderNumber_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orgId: 1, userId: 1 }, { background: true, name: "orders_orgId_userId" });
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "orders_orgId_status" });
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orgId: 1, createdAt: -1 }, { background: true, name: "orders_orgId_createdAt_desc" });

  // Invoices - STRICT v4.1: number unique per org
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex(
      { orgId: 1, number: 1 },
      {
        unique: true,
        background: true,
        name: "invoices_orgId_number_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection(COLLECTIONS.INVOICES).createIndex({ orgId: 1 }, { background: true, name: "invoices_orgId" });
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "invoices_orgId_status" });
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, dueDate: 1 }, { background: true, name: "invoices_orgId_dueDate" });
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, customerId: 1 }, { background: true, name: "invoices_orgId_customerId" });

  // Support Tickets - STRICT v4.1: code unique per org
  await db
    .collection("supporttickets")
    .createIndex(
      { orgId: 1, code: 1 },
      {
        unique: true,
        background: true,
        name: "supporttickets_orgId_code_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection("supporttickets")
    .createIndex({ orgId: 1 }, { background: true, name: "supporttickets_orgId" });
  await db
    .collection("supporttickets")
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "supporttickets_orgId_status" });
  await db
    .collection("supporttickets")
    .createIndex({ orgId: 1, priority: 1 }, { background: true, name: "supporttickets_orgId_priority" });
  await db
    .collection("supporttickets")
    .createIndex({ orgId: 1, "assignment.assignedTo.userId": 1 }, { background: true, name: "supporttickets_orgId_assignee" });
  await db
    .collection("supporttickets")
    .createIndex({ orgId: 1, createdAt: -1 }, { background: true, name: "supporttickets_orgId_createdAt_desc" });

  // Help Articles - STRICT v4.1: slug unique per org
  await db
    .collection("helparticles")
    .createIndex(
      { orgId: 1, slug: 1 },
      {
        unique: true,
        background: true,
        name: "helparticles_orgId_slug_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection("helparticles").createIndex({ orgId: 1 }, { background: true, name: "helparticles_orgId" });
  await db
    .collection("helparticles")
    .createIndex({ orgId: 1, category: 1 }, { background: true, name: "helparticles_orgId_category" });
  await db
    .collection("helparticles")
    .createIndex({ orgId: 1, published: 1 }, { background: true, name: "helparticles_orgId_published" });

  // CMS Pages - STRICT v4.1: slug unique per org
  await db
    .collection("cmspages")
    .createIndex(
      { orgId: 1, slug: 1 },
      {
        unique: true,
        background: true,
        name: "cmspages_orgId_slug_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection("cmspages").createIndex({ orgId: 1 }, { background: true, name: "cmspages_orgId" });
  await db
    .collection("cmspages")
    .createIndex({ orgId: 1, published: 1 }, { background: true, name: "cmspages_orgId_published" });
}

async function createQaIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  // ============================================================================
  // QA LOGS - AUDIT-2025-12-04: Multi-tenant isolation, platform queries, and TTL
  // ============================================================================
  
  // Org-scoped query index (sparse to exclude legacy docs without orgId)
  await db
    .collection("qa_logs")
    .createIndex({ orgId: 1, timestamp: -1 }, { 
      name: "qa_logs_orgId_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // Event-specific org-scoped query index
  await db
    .collection("qa_logs")
    .createIndex({ orgId: 1, event: 1, timestamp: -1 }, { 
      name: "qa_logs_orgId_event_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // PLATFORM-FRIENDLY: Global timestamp index for platform admin queries (no orgId filter)
  // Supports: db.qa_logs.find({}).sort({timestamp:-1}) and db.qa_logs.find({event:x}).sort({timestamp:-1})
  await db
    .collection("qa_logs")
    .createIndex({ timestamp: -1 }, { 
      name: "qa_logs_timestamp_desc", 
      background: true 
    });
  
  // PLATFORM-FRIENDLY: Event + timestamp for platform admin event-filtered queries
  await db
    .collection("qa_logs")
    .createIndex({ event: 1, timestamp: -1 }, { 
      name: "qa_logs_event_timestamp", 
      background: true 
    });
  
  // TTL index: Auto-delete qa_logs after 90 days to bound storage growth
  await db
    .collection("qa_logs")
    .createIndex({ timestamp: 1 }, { 
      name: "qa_logs_ttl_90d", 
      expireAfterSeconds: 90 * 24 * 60 * 60,  // 90 days
      background: true 
    });

  // ============================================================================
  // QA ALERTS - AUDIT-2025-12-04: Multi-tenant isolation, platform queries, and TTL
  // ============================================================================
  
  // Org-scoped query index (sparse to exclude legacy docs without orgId)
  await db
    .collection("qa_alerts")
    .createIndex({ orgId: 1, timestamp: -1 }, { 
      name: "qa_alerts_orgId_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // Event-specific org-scoped query index (parity with qa_logs for event filtering)
  await db
    .collection("qa_alerts")
    .createIndex({ orgId: 1, event: 1, timestamp: -1 }, { 
      name: "qa_alerts_orgId_event_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // PLATFORM-FRIENDLY: Global timestamp index for platform admin queries (no orgId filter)
  await db
    .collection("qa_alerts")
    .createIndex({ timestamp: -1 }, { 
      name: "qa_alerts_timestamp_desc", 
      background: true 
    });
  
  // PLATFORM-FRIENDLY: Event + timestamp for platform admin event-filtered queries
  await db
    .collection("qa_alerts")
    .createIndex({ event: 1, timestamp: -1 }, { 
      name: "qa_alerts_event_timestamp", 
      background: true 
    });
  
  // TTL index: Auto-delete qa_alerts after 30 days to bound storage growth
  await db
    .collection("qa_alerts")
    .createIndex({ timestamp: 1 }, { 
      name: "qa_alerts_ttl_30d", 
      expireAfterSeconds: 30 * 24 * 60 * 60,  // 30 days
      background: true 
    });
}

async function dropLegacyGlobalUniqueIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const targets: Array<{ collection: string; indexes: string[] }> = [
    { collection: COLLECTIONS.USERS, indexes: ["email_1"] },
    { collection: COLLECTIONS.PROPERTIES, indexes: ["code_1"] },
    // Also drop stale assignedTo index (field never existed - correct path is assignment.assignedTo.userId)
    { collection: COLLECTIONS.WORK_ORDERS, indexes: ["code_1", "workOrderNumber_1", "orgId_1_assignedTo_1_status_1"] },
    // Drop old non-org-scoped text index (replaced with products_orgId_text_search)
    { collection: COLLECTIONS.PRODUCTS, indexes: ["sku_1", "products_text_search"] },
    { collection: COLLECTIONS.ORDERS, indexes: ["orderNumber_1"] },
    { collection: COLLECTIONS.INVOICES, indexes: ["invoiceNumber_1", "number_1", "code_1"] },
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
        if (isMissing) {
          continue;
        }
        logger.warn(`[indexes] Failed to drop legacy index`, {
          collection,
          indexName,
          error: err?.message,
        });
      }
    }
  }
}

let qaIndexesPromise: Promise<void> | null = null;

/**
 * Ensure QA-related indexes (logs/alerts) are created once per process start.
 * Guards against drift when migrations are skipped; idempotent via Mongo driver.
 */
export async function ensureQaIndexes(): Promise<void> {
  if (!qaIndexesPromise) {
    qaIndexesPromise = getDatabase()
      .then((db) => createQaIndexes(db))
      .catch((err) => {
        qaIndexesPromise = null;
        throw err;
      });
  }
  return qaIndexesPromise;
}

/**
 * Safe insert operation with timestamp validation
 */
export async function safeInsertOne<T extends Record<string, unknown>>(
  collectionName: string,
  document: T,
): Promise<{ acknowledged: boolean; insertedId: unknown }> {
  const db = await getDatabase();
  const collection = db.collection(collectionName);

  const sanitizedDoc = sanitizeTimestamps(document);
  return await collection.insertOne(sanitizedDoc);
}

/**
 * Safe bulk insert operation with timestamp validation
 */
export async function safeInsertMany<T extends Record<string, unknown>>(
  collectionName: string,
  documents: T[],
): Promise<{
  acknowledged: boolean;
  insertedCount: number;
  insertedIds: Record<number, unknown>;
}> {
  const db = await getDatabase();
  const collection = db.collection(collectionName);

  const sanitizedDocs = validateCollection(documents);
  return await collection.insertMany(sanitizedDocs);
}

/**
 * Safe update operation with timestamp validation
 */
export async function safeUpdateOne<T extends Record<string, unknown>>(
  collectionName: string,
  filter: Record<string, unknown>,
  update: T,
): Promise<{
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
}> {
  const db = await getDatabase();
  const collection = db.collection(collectionName);

  const sanitizedUpdate = sanitizeTimestamps(update, ["updatedAt"]);
  return await collection.updateOne(filter, { $set: sanitizedUpdate });
}

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

// Collection names
export const COLLECTIONS = {
  TENANTS: "tenants",
  USERS: "users",
  PROPERTIES: "properties",
  WORK_ORDERS: "workOrders",
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
export async function createIndexes() {
  const db = await getDatabase();

  // Users
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ email: 1 }, { unique: true });
  await db.collection(COLLECTIONS.USERS).createIndex({ tenantId: 1 });

  // Properties
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex({ code: 1 }, { unique: true });
  await db.collection(COLLECTIONS.PROPERTIES).createIndex({ tenantId: 1 });

  // Work Orders
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ code: 1 }, { unique: true });
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ tenantId: 1, status: 1 });

  // Products
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex({ sku: 1 }, { unique: true });
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex({ tenantId: 1, categoryId: 1 });
  await db
    .collection(COLLECTIONS.PRODUCTS)
    .createIndex({ title: "text", description: "text" });

  // Orders
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orderNumber: 1 }, { unique: true });
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ tenantId: 1, userId: 1 });

  // Invoices
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ invoiceNumber: 1 }, { unique: true });
  await db.collection(COLLECTIONS.INVOICES).createIndex({ tenantId: 1 });
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

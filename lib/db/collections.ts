/**
 * @file Database Collections and Index Management
 * @description Central module for MongoDB collection access and index creation.
 * @module lib/db/collections
 * 
 * REFACTORED: 2025-01-15
 * - COLLECTIONS constant extracted to lib/db/collection-names.ts
 * - Legacy index cleanup extracted to lib/db/indexes/legacy-cleanup.ts
 * - QA indexes extracted to lib/db/indexes/qa-indexes.ts
 */

import type { Db } from "mongodb";
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

// Re-export COLLECTIONS from extracted module for backward compatibility
export { COLLECTIONS, type CollectionName } from "@/lib/db/collection-names";

// Import COLLECTIONS for local use
import { COLLECTIONS } from "@/lib/db/collection-names";

// Import extracted index functions
import {
  createQaIndexes,
  ensureQaIndexes as ensureQaIndexesInternal,
  dropLegacyUserIndexes,
  dropLegacyWorkOrderIndexes,
  dropLegacyInvoiceIndexes,
  dropLegacySubscriptionInvoiceIndexes,
  dropLegacyAssetIndexes,
  dropLegacySLAIndexes,
  dropLegacySupportTicketIndexes,
  dropLegacyFMApprovalIndexes,
  dropLegacyEmployeeIndexes,
  dropLegacyErrorEventIndexes,
  dropLegacyClaimIndexes,
  dropLegacyRmaIndexes,
  dropLegacyAdvertisingIndexes,
  dropLegacyFeeScheduleIndexes,
  dropLegacyGlobalUniqueIndexes,
  dropLegacyQaIndexes,
} from "@/lib/db/indexes";

// Re-export ensureQaIndexes for backward compatibility
export const ensureQaIndexes = ensureQaIndexesInternal;

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
    orders: db.collection<Order>(COLLECTIONS.CLAIMS_ORDERS), // TD-002: Use claims_orders, not legacy orders
    invoices: db.collection<Invoice>(COLLECTIONS.INVOICES),
    rfqs: db.collection<RFQ>(COLLECTIONS.RFQS),
    reviews: db.collection<Review>(COLLECTIONS.REVIEWS),
    notifications: db.collection<NotificationDoc>(COLLECTIONS.NOTIFICATIONS),
  };
}

async function dropDefaultOrgIdIndexes(db: Db) {
  const indexName = "orgId_1";
  await Promise.all(
    Object.values(COLLECTIONS).map(async (collectionName) => {
      try {
        await db.collection(collectionName).dropIndex(indexName);
      } catch (error) {
        const message = (error as Error).message || "";
        if (
          !/index not found/i.test(message) &&
          !/ns not found/i.test(message)
        ) {
          logger.debug("Skipping orgId_1 drop", { collectionName, error: message });
        }
      }
    }),
  );
}

// Create indexes
// STRICT v4.1: All unique indexes MUST be org-scoped for proper multi-tenancy.
// This prevents cross-tenant collisions (e.g., same email/SKU in different orgs).
export async function createIndexes() {
  const db = await getDatabase();

  // Clean up legacy global unique indexes so org-scoped uniques can be enforced
  await dropLegacyGlobalUniqueIndexes(db);
  // Clean up legacy QA indexes that conflict with TTL/org-scoped variants
  await dropLegacyQaIndexes(db);
  // Clean up legacy user indexes that clash with named variants
  await dropLegacyUserIndexes(db);
  // Clean up legacy work order indexes that clash with named variants
  await dropLegacyWorkOrderIndexes(db);
  // Clean up legacy invoice indexes that clash with named variants
  await dropLegacyInvoiceIndexes(db);
  // Clean up legacy subscription invoice indexes that clash with named variants
  await dropLegacySubscriptionInvoiceIndexes(db);
  // Clean up legacy asset indexes that clash with named variants
  await dropLegacyAssetIndexes(db);
  // Clean up legacy SLA indexes that clash with named variants
  await dropLegacySLAIndexes(db);
  // Clean up legacy support ticket indexes that clash with named variants
  await dropLegacySupportTicketIndexes(db);
  // Clean up legacy FM approval indexes that clash with named variants
  await dropLegacyFMApprovalIndexes(db);
  // Clean up legacy employee indexes that clash with named variants
  await dropLegacyEmployeeIndexes(db);
  // Clean up legacy error event indexes that clash with named variants
  await dropLegacyErrorEventIndexes(db);
  // Clean up legacy advertising/fee schedule indexes that clash with org-scoped variants
  await dropLegacyAdvertisingIndexes(db);
  await dropLegacyFeeScheduleIndexes(db);
  // Clean up legacy claims/RMA indexes that clash with org-scoped variants
  await dropLegacyClaimIndexes(db);
  await dropLegacyRmaIndexes(db);
  // Clean up default orgId index names so named orgId indexes can be recreated idempotently
  await dropDefaultOrgIdIndexes(db);
  // Ensure employeeId unique index uses canonical partial filter
  try {
    await db.collection(COLLECTIONS.USERS).dropIndex("users_orgId_employeeId_unique");
  } catch (error) {
    const message = (error as Error).message || String(error);
    if (!/index not found/i.test(message)) {
      logger.warn("Could not drop legacy users_orgId_employeeId_unique", { error: message });
    }
  }

  await createQaIndexes(db);

  // Note: Error Events indexes are defined below in the ERROR_EVENTS section (lines ~760+)
  // with the canonical name: error_events_orgId_incidentKey_unique

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
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex(
      { orgId: 1, username: 1 },
      {
        unique: true,
        background: true,
        name: "users_orgId_username_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex(
      { orgId: 1, code: 1 },
      {
        unique: true,
        background: true,
        name: "users_orgId_code_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ orgId: 1, "professional.role": 1 }, { background: true, name: "users_orgId_professional_role" });
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex(
      { orgId: 1, "professional.subRole": 1 },
      { background: true, name: "users_orgId_professional_subRole" },
    );
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex(
      { orgId: 1, "professional.skills.category": 1 },
      { background: true, name: "users_orgId_skills_category" },
    );
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ orgId: 1, "workload.available": 1 }, { background: true, name: "users_orgId_workload_available" });
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ orgId: 1, "performance.rating": -1 }, { background: true, name: "users_orgId_performance_rating" });
  await db
    .collection(COLLECTIONS.USERS)
    .createIndex({ orgId: 1, isSuperAdmin: 1 }, { background: true, name: "users_orgId_isSuperAdmin" });

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
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex({ orgId: 1, "units.status": 1 }, { background: true, name: "properties_orgId_unitStatus" });
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex({ "address.location": "2dsphere" }, { background: true, name: "properties_location_2dsphere" });

  // Work Orders - STRICT v4.1: workOrderNumber unique per org
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, workOrderNumber: 1 },
      {
        unique: true,
        background: true,
        name: "workorders_orgId_workOrderNumber_unique",
        // Exclude documents without a string workOrderNumber to avoid collisions on null/undefined
        partialFilterExpression: { orgId: { $exists: true }, workOrderNumber: { $type: "string" } },
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
    .createIndex(
      { orgId: 1, priority: 1, "sla.status": 1 },
      { background: true, name: "workorders_orgId_priority_slaStatus" },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex({ orgId: 1, "location.propertyId": 1 }, { background: true, name: "workorders_orgId_propertyId" });
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, "location.propertyId": 1, status: 1 },
      { background: true, name: "workorders_orgId_propertyId_status" },
    );
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
      { orgId: 1, "assignment.assignedTo.userId": 1, status: 1 },
      { background: true, name: "workorders_orgId_assignedUser_status" },
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
      { orgId: 1, status: 1, createdAt: -1 },
      { background: true, name: "workorders_orgId_status_createdAt_desc" },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { orgId: 1, title: "text", description: "text", "work.solutionDescription": "text" },
      { background: true, name: "workorders_text_search" },
    );
  await db
    .collection(COLLECTIONS.WORK_ORDERS)
    .createIndex(
      { "sla.resolutionDeadline": 1 },
      { background: true, name: "workorders_sla_resolutionDeadline", sparse: true },
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
    .createIndex(
      { orgId: 1, slug: 1 },
      {
        unique: true,
        background: true,
        name: "products_orgId_slug_unique",
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
      { orgId: 1, title: "text", summary: "text", brand: "text", standards: "text" },
      {
        background: true,
        name: "products_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Orders (Claims) - STRICT v4.1: orderNumber unique per org
  // TD-002: Use CLAIMS_ORDERS collection instead of legacy ORDERS
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
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
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex({ orgId: 1, userId: 1 }, { background: true, name: "orders_orgId_userId" });
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "orders_orgId_status" });
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex({ orgId: 1, createdAt: -1 }, { background: true, name: "orders_orgId_createdAt_desc" });
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex({ orgId: 1, buyerUserId: 1, status: 1 }, { background: true, name: "orders_orgId_buyer_status" });
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex({ orgId: 1, vendorId: 1, status: 1 }, { background: true, name: "orders_orgId_vendor_status" });
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex({ orgId: 1, "source.workOrderId": 1 }, { background: true, name: "orders_orgId_source_workOrderId" });
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex(
      { orgId: 1, orderId: 1 },
      {
        unique: true,
        background: true,
        name: "orders_orgId_orderId_unique",
        partialFilterExpression: { orgId: { $exists: true }, orderId: { $exists: true } },
      },
    );

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
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, "recipient.customerId": 1 }, { background: true, name: "invoices_orgId_recipient_customerId" });
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, issueDate: -1 }, { background: true, name: "invoices_orgId_issueDate_desc" });
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, "zatca.status": 1 }, { background: true, name: "invoices_orgId_zatca_status" });
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex({ orgId: 1, type: 1, status: 1 }, { background: true, name: "invoices_orgId_type_status" });

  // Subscription Invoices (recurring billing)
  await db
    .collection(COLLECTIONS.SUBSCRIPTION_INVOICES)
    .createIndex({ orgId: 1, status: 1, dueDate: 1 }, { background: true, name: "subscriptioninvoices_orgId_status_dueDate" });
  await db
    .collection(COLLECTIONS.SUBSCRIPTION_INVOICES)
    .createIndex(
      { orgId: 1, subscriptionId: 1, dueDate: -1 },
      { background: true, name: "subscriptioninvoices_orgId_subscription_dueDate_desc" },
    );
  await db
    .collection(COLLECTIONS.SUBSCRIPTION_INVOICES)
    .createIndex(
      { orgId: 1, subscriptionId: 1, status: 1 },
      { background: true, name: "subscriptioninvoices_orgId_subscription_status" },
    );

  // Assets
  await db
    .collection(COLLECTIONS.ASSETS)
    .createIndex({ orgId: 1, type: 1 }, { background: true, name: "assets_orgId_type" });
  await db
    .collection(COLLECTIONS.ASSETS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "assets_orgId_status" });
  await db
    .collection(COLLECTIONS.ASSETS)
    .createIndex({ orgId: 1, "pmSchedule.nextPM": 1 }, { background: true, name: "assets_orgId_nextPM" });
  await db
    .collection(COLLECTIONS.ASSETS)
    .createIndex({ orgId: 1, "condition.score": 1 }, { background: true, name: "assets_orgId_conditionScore" });
  await db
    .collection(COLLECTIONS.ASSETS)
    .createIndex(
      { orgId: 1, code: 1 },
      {
        unique: true,
        background: true,
        name: "assets_orgId_code_unique",
        partialFilterExpression: { orgId: { $exists: true }, code: { $exists: true } },
      },
    );

  // SLA
  await db
    .collection(COLLECTIONS.SLAS)
    .createIndex(
      { orgId: 1, code: 1 },
      {
        unique: true,
        background: true,
        name: "slas_orgId_code_unique",
        partialFilterExpression: { orgId: { $exists: true }, code: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SLAS)
    .createIndex({ orgId: 1, type: 1 }, { background: true, name: "slas_orgId_type" });
  await db
    .collection(COLLECTIONS.SLAS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "slas_orgId_status" });
  await db
    .collection(COLLECTIONS.SLAS)
    .createIndex({ orgId: 1, priority: 1 }, { background: true, name: "slas_orgId_priority" });

  // FM Approvals
  await db
    .collection(COLLECTIONS.FM_APPROVALS)
    .createIndex({ orgId: 1, approvalNumber: 1 }, { background: true, unique: true, name: "fmApprovals_orgId_approvalNumber_unique" });
  await db
    .collection(COLLECTIONS.FM_APPROVALS)
    .createIndex({ orgId: 1, entityId: 1, entityType: 1 }, { background: true, name: "fmApprovals_orgId_entity" });
  await db
    .collection(COLLECTIONS.FM_APPROVALS)
    .createIndex({ orgId: 1, approverId: 1, status: 1 }, { background: true, name: "fmApprovals_orgId_approver_status" });
  await db
    .collection(COLLECTIONS.FM_APPROVALS)
    .createIndex({ orgId: 1, status: 1, dueDate: 1 }, { background: true, name: "fmApprovals_orgId_status_dueDate" });
  await db
    .collection(COLLECTIONS.FM_APPROVALS)
    .createIndex({ orgId: 1, workflowId: 1 }, { background: true, name: "fmApprovals_orgId_workflowId" });

  // Agent Audit Logs (includes TTL)
  await db
    .collection(COLLECTIONS.AGENT_AUDIT_LOGS)
    .createIndex({ agent_id: 1, timestamp: -1 }, { background: true, name: "agentAudit_agent_timestamp_desc" });
  await db
    .collection(COLLECTIONS.AGENT_AUDIT_LOGS)
    .createIndex({ assumed_user_id: 1, timestamp: -1 }, { background: true, name: "agentAudit_assumedUser_timestamp_desc" });
  await db
    .collection(COLLECTIONS.AGENT_AUDIT_LOGS)
    .createIndex({ orgId: 1, timestamp: -1 }, { background: true, name: "agentAudit_orgId_timestamp_desc" });
  await db
    .collection(COLLECTIONS.AGENT_AUDIT_LOGS)
    .createIndex({ orgId: 1, resource_type: 1, timestamp: -1 }, { background: true, name: "agentAudit_orgId_resourceType_timestamp_desc" });
  await db
    .collection(COLLECTIONS.AGENT_AUDIT_LOGS)
    .createIndex({ orgId: 1, success: 1, timestamp: -1 }, { background: true, name: "agentAudit_orgId_success_timestamp_desc" });
  await db
    .collection(COLLECTIONS.AGENT_AUDIT_LOGS)
    .createIndex({ timestamp: 1 }, { background: true, expireAfterSeconds: 31536000, name: "agentAudit_timestamp_ttl_1y" });

  // Support Tickets - STRICT v4.1: code unique per org
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .createIndex({ orgId: 1, code: 1 }, {
      unique: true,
      background: true,
      name: "supporttickets_orgId_code_unique",
      partialFilterExpression: { orgId: { $exists: true } },
    });
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .createIndex({ orgId: 1 }, { background: true, name: "supporttickets_orgId" });
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "supporttickets_orgId_status" });
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .createIndex({ orgId: 1, priority: 1 }, { background: true, name: "supporttickets_orgId_priority" });
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .createIndex({ orgId: 1, "assignment.assignedTo.userId": 1 }, { background: true, name: "supporttickets_orgId_assignee" });
  await db
    .collection(COLLECTIONS.SUPPORT_TICKETS)
    .createIndex({ orgId: 1, createdAt: -1 }, { background: true, name: "supporttickets_orgId_createdAt_desc" });

  // HR - Employees
  await db
    .collection(COLLECTIONS.EMPLOYEES)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "employees_orgId_status" });
  await db
    .collection(COLLECTIONS.EMPLOYEES)
    .createIndex({ orgId: 1 }, { background: true, name: "employees_orgId" });

  // HR - Attendance
  await db
    .collection(COLLECTIONS.ATTENDANCE)
    .createIndex({ orgId: 1, date: 1 }, { background: true, name: "attendance_orgId_date" });

  // CRM - Customers & Contracts
  await db
    .collection(COLLECTIONS.CUSTOMERS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "customers_orgId_status" });
  await db
    .collection(COLLECTIONS.CUSTOMERS)
    .createIndex({ orgId: 1, type: 1 }, { background: true, name: "customers_orgId_type" });
  await db
    .collection(COLLECTIONS.CONTRACTS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "contracts_orgId_status" });

  // Admin - Roles & API Keys
  await db
    .collection(COLLECTIONS.ROLES)
    .createIndex({ orgId: 1, slug: 1 }, { background: true, name: "roles_orgId_slug" });
  await db
    .collection(COLLECTIONS.API_KEYS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "apikeys_orgId_status" });

  // Souq marketplace
  await db
    .collection(COLLECTIONS.SOUQ_LISTINGS)
    .createIndex({ orgId: 1, status: 1 }, { background: true, name: "souq_listings_orgId_status" });
  await db
    .collection(COLLECTIONS.SOUQ_LISTINGS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "souq_listings_orgId_seller_status" });
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex({ orgId: 1, createdAt: -1 }, { background: true, name: "souq_orders_orgId_createdAt" });
  // Legacy dual-field indexes to keep $or orgId/org_id queries performant during migration
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex({ org_id: 1, createdAt: -1 }, { background: true, name: "souq_orders_org_id_createdAt", sparse: true });
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { orgId: 1, "items.sellerId": 1, createdAt: -1 },
      { background: true, name: "souq_orders_orgId_seller_createdAt" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { org_id: 1, "items.sellerId": 1, createdAt: -1 },
      { background: true, name: "souq_orders_org_id_seller_createdAt", sparse: true },
    );
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { orgId: 1, status: 1, createdAt: -1 },
      { background: true, name: "souq_orders_orgId_status_createdAt_desc" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { org_id: 1, status: 1, createdAt: -1 },
      { background: true, name: "souq_orders_org_id_status_createdAt_desc", sparse: true },
    );
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { orgId: 1, orderId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_orders_orgId_orderId_unique",
        partialFilterExpression: { orgId: { $exists: true }, orderId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { org_id: 1, orderId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_orders_org_id_orderId_unique",
        // Note: sparse is incompatible with partialFilterExpression
        partialFilterExpression: { org_id: { $exists: true }, orderId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SETTLEMENTS)
    .createIndex(
      { orgId: 1, settlementId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_settlements_orgId_settlementId_unique",
        partialFilterExpression: { orgId: { $exists: true }, settlementId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SETTLEMENTS)
    .createIndex(
      { orgId: 1, sellerId: 1, period: 1 },
      {
        unique: true,
        background: true,
        name: "souq_settlements_orgId_seller_period_unique",
        partialFilterExpression: { orgId: { $exists: true }, sellerId: { $exists: true }, period: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SETTLEMENTS)
    .createIndex(
      { orgId: 1, status: 1, dueDate: 1 },
      { background: true, name: "souq_settlements_orgId_status_dueDate" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SETTLEMENTS)
    .createIndex(
      { orgId: 1, createdAt: -1 },
      { background: true, name: "souq_settlements_orgId_createdAt_desc" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_WITHDRAWAL_REQUESTS)
    .createIndexes([
      { key: { requestId: 1 }, unique: true, background: true, name: "souq_withdrawals_requestId_unique" },
      { key: { payoutId: 1, orgId: 1 }, background: true, name: "souq_withdrawals_payout_org" },
      {
        key: { orgId: 1, sellerId: 1, status: 1, requestedAt: -1 },
        background: true,
        name: "souq_withdrawals_org_seller_status_requestedAt",
      },
    ]);
  await db
    .collection(COLLECTIONS.SOUQ_PAYOUTS)
    .createIndex(
      { orgId: 1, payoutId: 1 },
      {
        background: true,
        name: "souq_payouts_orgId_payoutId",
        partialFilterExpression: { orgId: { $exists: true }, payoutId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_PAYOUTS)
    .createIndex(
      { orgId: 1, sellerId: 1, status: 1, requestedAt: -1 },
      { background: true, name: "souq_payouts_orgId_seller_status_requestedAt_desc" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SELLER_BALANCES)
    .createIndex(
      { orgId: 1, sellerId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_seller_balances_org_seller_unique",
        partialFilterExpression: { orgId: { $exists: true }, sellerId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_REVIEWS)
    .createIndex({ orgId: 1, productId: 1 }, { background: true, name: "souq_reviews_orgId_productId" });
  await db
    .collection(COLLECTIONS.SOUQ_CAMPAIGNS)
    .createIndex(
      { orgId: 1, campaignId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_campaigns_orgId_campaignId_unique",
        partialFilterExpression: { orgId: { $exists: true }, campaignId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_CAMPAIGNS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "souq_campaigns_orgId_seller_status" });
  await db
    .collection(COLLECTIONS.SOUQ_CAMPAIGNS)
    .createIndex({ orgId: 1, startAt: 1, endAt: 1 }, { background: true, name: "souq_campaigns_orgId_start_end" });
  await db
    .collection(COLLECTIONS.SOUQ_CAMPAIGNS)
    .createIndex({ orgId: 1, "stats.spend": -1 }, { background: true, name: "souq_campaigns_orgId_spend_desc" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_GROUPS)
    .createIndex(
      { orgId: 1, adGroupId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_ad_groups_orgId_adGroupId_unique",
        partialFilterExpression: { orgId: { $exists: true }, adGroupId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_AD_GROUPS)
    .createIndex({ orgId: 1, campaignId: 1, status: 1 }, { background: true, name: "souq_ad_groups_orgId_campaign_status" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_GROUPS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "souq_ad_groups_orgId_seller_status" });
  await db
    .collection(COLLECTIONS.SOUQ_ADS)
    .createIndex(
      { orgId: 1, adId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_ads_orgId_adId_unique",
        partialFilterExpression: { orgId: { $exists: true }, adId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_ADS)
    .createIndex({ orgId: 1, adGroupId: 1, status: 1 }, { background: true, name: "souq_ads_orgId_adGroup_status" });
  await db
    .collection(COLLECTIONS.SOUQ_ADS)
    .createIndex({ orgId: 1, productId: 1, status: 1 }, { background: true, name: "souq_ads_orgId_product_status" });
  await db
    .collection(COLLECTIONS.SOUQ_ADS)
    .createIndex({ orgId: 1, qualityScore: -1 }, { background: true, name: "souq_ads_orgId_qualityScore_desc" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_TARGETS)
    .createIndex(
      { orgId: 1, targetId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_ad_targets_orgId_targetId_unique",
        partialFilterExpression: { orgId: { $exists: true }, targetId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_AD_TARGETS)
    .createIndex(
      { orgId: 1, adGroupId: 1, status: 1, isNegative: 1 },
      { background: true, name: "souq_ad_targets_orgId_adGroup_status_negative" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_AD_TARGETS)
    .createIndex({ orgId: 1, targetType: 1, status: 1 }, { background: true, name: "souq_ad_targets_orgId_targetType_status" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_TARGETS)
    .createIndex(
      { orgId: 1, keyword: 1, matchType: 1 },
      { background: true, name: "souq_ad_targets_orgId_keyword_matchType", sparse: true },
    );
  await db
    .collection(COLLECTIONS.SOUQ_FEE_SCHEDULES)
    .createIndex(
      { orgId: 1, feeScheduleId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_fee_schedules_orgId_feeScheduleId_unique",
        partialFilterExpression: { orgId: { $exists: true }, feeScheduleId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_FEE_SCHEDULES)
    .createIndex({ orgId: 1, isActive: 1, effectiveFrom: -1 }, { background: true, name: "souq_fee_schedules_orgId_active_effectiveFrom_desc" });
  await db
    .collection(COLLECTIONS.SOUQ_FEE_SCHEDULES)
    .createIndex({ orgId: 1, version: 1 }, { background: true, name: "souq_fee_schedules_orgId_version" });
  await db
    .collection(COLLECTIONS.CLAIMS)
    .createIndex(
      { orgId: 1, claimId: 1 },
      {
        unique: true,
        background: true,
        name: "claims_orgId_claimId_unique",
        partialFilterExpression: { orgId: { $exists: true }, claimId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.CLAIMS)
    .createIndex({ orgId: 1, status: 1, createdAt: -1 }, { background: true, name: "claims_orgId_status_createdAt" });
  await db
    .collection(COLLECTIONS.CLAIMS)
    .createIndex({ orgId: 1, buyerId: 1, status: 1 }, { background: true, name: "claims_orgId_buyer_status" });
  await db
    .collection(COLLECTIONS.CLAIMS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "claims_orgId_seller_status" });
  await db
    .collection(COLLECTIONS.CLAIMS)
    .createIndex(
      { orgId: 1, sellerResponseDeadline: 1, status: 1 },
      { background: true, name: "claims_orgId_responseDeadline_status" },
    );
  await db
    .collection(COLLECTIONS.SOUQ_RMAS)
    .createIndex(
      { orgId: 1, rmaId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_rmas_orgId_rmaId_unique",
        partialFilterExpression: { orgId: { $exists: true }, rmaId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_RMAS)
    .createIndex({ orgId: 1, status: 1, createdAt: -1 }, { background: true, name: "souq_rmas_orgId_status_createdAt" });
  await db
    .collection(COLLECTIONS.SOUQ_RMAS)
    .createIndex({ orgId: 1, buyerId: 1, status: 1 }, { background: true, name: "souq_rmas_orgId_buyer_status" });
  await db
    .collection(COLLECTIONS.SOUQ_RMAS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "souq_rmas_orgId_seller_status" });
  await db
    .collection(COLLECTIONS.SOUQ_RMAS)
    .createIndex({ orgId: 1, returnDeadline: 1 }, { background: true, name: "souq_rmas_orgId_returnDeadline" });

  // Souq refunds - tenant isolation and claim uniqueness
  await db
    .collection(COLLECTIONS.SOUQ_REFUNDS)
    .createIndex({ orgId: 1, claimId: 1 }, { unique: true, background: true, name: "souq_refunds_orgId_claimId_unique" });
  await db
    .collection(COLLECTIONS.SOUQ_REFUNDS)
    .createIndex({ orgId: 1, status: 1, createdAt: -1 }, { background: true, name: "souq_refunds_orgId_status_createdAt" });
  await db
    .collection(COLLECTIONS.SOUQ_REFUNDS)
    .createIndex({ orgId: 1, nextRetryAt: 1 }, { background: true, name: "souq_refunds_orgId_nextRetryAt" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_SELLERS - Seller profiles with org-scoped uniqueness
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_SELLERS)
    .createIndex(
      { orgId: 1, sellerId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_sellers_orgId_sellerId_unique",
        partialFilterExpression: { orgId: { $exists: true }, sellerId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SELLERS)
    .createIndex({ orgId: 1, status: 1, _id: 1 }, { background: true, name: "souq_sellers_orgId_status_id" });
  await db
    .collection(COLLECTIONS.SOUQ_SELLERS)
    .createIndex({ orgId: 1, "bankInfo.verified": 1 }, { background: true, name: "souq_sellers_orgId_bankVerified" });
  await db
    .collection(COLLECTIONS.SOUQ_SELLERS)
    .createIndex({ orgId: 1, createdAt: -1 }, { background: true, name: "souq_sellers_orgId_createdAt_desc" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_PRODUCTS - Product catalog with org-scoped FSIN uniqueness
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_PRODUCTS)
    .createIndex(
      { orgId: 1, fsin: 1 },
      {
        unique: true,
        background: true,
        name: "souq_products_orgId_fsin_unique",
        partialFilterExpression: { orgId: { $exists: true }, fsin: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_PRODUCTS)
    .createIndex({ orgId: 1, createdBy: 1, isActive: 1 }, { background: true, name: "souq_products_orgId_createdBy_isActive" });
  await db
    .collection(COLLECTIONS.SOUQ_PRODUCTS)
    .createIndex({ orgId: 1, isActive: 1 }, { background: true, name: "souq_products_orgId_isActive" });
  await db
    .collection(COLLECTIONS.SOUQ_PRODUCTS)
    .createIndex({ orgId: 1, category: 1, isActive: 1 }, { background: true, name: "souq_products_orgId_category_isActive" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_TRANSACTIONS - Transaction ledger with org-scoped uniqueness
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_TRANSACTIONS)
    .createIndex(
      { orgId: 1, transactionId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_transactions_orgId_transactionId_unique",
        partialFilterExpression: { orgId: { $exists: true }, transactionId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_TRANSACTIONS)
    .createIndex({ orgId: 1, sellerId: 1, createdAt: -1 }, { background: true, name: "souq_transactions_orgId_seller_createdAt_desc" });
  await db
    .collection(COLLECTIONS.SOUQ_TRANSACTIONS)
    .createIndex({ orgId: 1, type: 1, createdAt: -1 }, { background: true, name: "souq_transactions_orgId_type_createdAt_desc" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_SETTLEMENT_STATEMENTS - Statement tracking
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_SETTLEMENT_STATEMENTS)
    .createIndex(
      { orgId: 1, statementId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_settlement_statements_orgId_statementId_unique",
        partialFilterExpression: { orgId: { $exists: true }, statementId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_SETTLEMENT_STATEMENTS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "souq_settlement_statements_orgId_seller_status" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_WITHDRAWALS - Withdrawal requests
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_WITHDRAWALS)
    .createIndex(
      { orgId: 1, withdrawalId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_withdrawals_orgId_withdrawalId_unique",
        partialFilterExpression: { orgId: { $exists: true }, withdrawalId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_WITHDRAWALS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1, createdAt: -1 }, { background: true, name: "souq_withdrawals_orgId_seller_status_createdAt_desc" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_PAYOUT_BATCHES - Batch payout processing
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_PAYOUT_BATCHES)
    .createIndex(
      { orgId: 1, batchId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_payout_batches_orgId_batchId_unique",
        partialFilterExpression: { orgId: { $exists: true }, batchId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_PAYOUT_BATCHES)
    .createIndex({ orgId: 1, status: 1, createdAt: -1 }, { background: true, name: "souq_payout_batches_orgId_status_createdAt_desc" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_AD_BIDS - Ad bidding with org-scoped uniqueness
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_AD_BIDS)
    .createIndex(
      { orgId: 1, bidId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_ad_bids_orgId_bidId_unique",
        partialFilterExpression: { orgId: { $exists: true }, bidId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_AD_BIDS)
    .createIndex({ orgId: 1, campaignId: 1, status: 1 }, { background: true, name: "souq_ad_bids_orgId_campaign_status" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_BIDS)
    .createIndex({ orgId: 1, sellerId: 1, status: 1 }, { background: true, name: "souq_ad_bids_orgId_seller_status" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_AD_EVENTS - Ad event tracking with TTL
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_AD_EVENTS)
    .createIndex({ orgId: 1, bidId: 1, eventType: 1, timestamp: -1 }, { background: true, name: "souq_ad_events_orgId_bid_type_timestamp_desc" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_EVENTS)
    .createIndex({ orgId: 1, campaignId: 1, timestamp: -1 }, { background: true, name: "souq_ad_events_orgId_campaign_timestamp_desc" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_EVENTS)
    .createIndex({ timestamp: 1 }, { background: true, expireAfterSeconds: 7776000, name: "souq_ad_events_ttl_90days" }); // 90 day TTL

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_AD_STATS - Ad performance statistics
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_AD_STATS)
    .createIndex(
      { orgId: 1, bidId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_ad_stats_orgId_bidId_unique",
        partialFilterExpression: { orgId: { $exists: true }, bidId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_AD_STATS)
    .createIndex({ orgId: 1, campaignId: 1 }, { background: true, name: "souq_ad_stats_orgId_campaign" });
  await db
    .collection(COLLECTIONS.SOUQ_AD_STATS)
    .createIndex({ orgId: 1, sellerId: 1, date: -1 }, { background: true, name: "souq_ad_stats_orgId_seller_date_desc" });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔐 STRICT v4.1: SOUQ_AD_DAILY_SPEND - Daily spend tracking
  // ═══════════════════════════════════════════════════════════════════════════
  await db
    .collection(COLLECTIONS.SOUQ_AD_DAILY_SPEND)
    .createIndex(
      { orgId: 1, campaignId: 1, date: 1 },
      {
        unique: true,
        background: true,
        name: "souq_ad_daily_spend_orgId_campaign_date_unique",
        partialFilterExpression: { orgId: { $exists: true }, campaignId: { $exists: true }, date: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.SOUQ_AD_DAILY_SPEND)
    .createIndex({ orgId: 1, sellerId: 1, date: -1 }, { background: true, name: "souq_ad_daily_spend_orgId_seller_date_desc" });

  // Help Articles - STRICT v4.1: slug unique per org
  await db
    .collection(COLLECTIONS.HELP_ARTICLES)
    .createIndex(
      { orgId: 1, slug: 1 },
      {
        unique: true,
        background: true,
        name: "helparticles_orgId_slug_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection(COLLECTIONS.HELP_ARTICLES).createIndex({ orgId: 1 }, { background: true, name: "helparticles_orgId" });
  await db
    .collection(COLLECTIONS.HELP_ARTICLES)
    .createIndex({ orgId: 1, category: 1 }, { background: true, name: "helparticles_orgId_category" });
  await db
    .collection(COLLECTIONS.HELP_ARTICLES)
    .createIndex({ orgId: 1, published: 1 }, { background: true, name: "helparticles_orgId_published" });

  // CMS Pages - STRICT v4.1: slug unique per org
  await db
    .collection(COLLECTIONS.CMS_PAGES)
    .createIndex(
      { orgId: 1, slug: 1 },
      {
        unique: true,
        background: true,
        name: "cmspages_orgId_slug_unique",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db.collection(COLLECTIONS.CMS_PAGES).createIndex({ orgId: 1 }, { background: true, name: "cmspages_orgId" });
  await db
    .collection(COLLECTIONS.CMS_PAGES)
    .createIndex({ orgId: 1, published: 1 }, { background: true, name: "cmspages_orgId_published" });

  // Communication Logs - STRICT v4.1: always org-scoped for tenant isolation
  await db
    .collection(COLLECTIONS.COMMUNICATION_LOGS)
    .createIndex(
      { orgId: 1, userId: 1, createdAt: -1 },
      {
        background: true,
        name: "communication_logs_orgId_userId_createdAt_desc",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.COMMUNICATION_LOGS)
    .createIndex(
      { orgId: 1, channel: 1, type: 1, createdAt: -1 },
      {
        background: true,
        name: "communication_logs_orgId_channel_type_createdAt_desc",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.COMMUNICATION_LOGS)
    .createIndex(
      { orgId: 1, status: 1, createdAt: -1 },
      {
        background: true,
        name: "communication_logs_orgId_status_createdAt_desc",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
  // Index for Taqnyat message ID lookups (SMS delivery status queries)
  await db
    .collection(COLLECTIONS.COMMUNICATION_LOGS)
    .createIndex(
      { "metadata.taqnyatId": 1 },
      {
        background: true,
        name: "communication_logs_metadata_taqnyatId",
        // Note: sparse is incompatible with partialFilterExpression
        partialFilterExpression: { "metadata.taqnyatId": { $exists: true } },
      },
    );

  // Error Events (Support/Incidents) - STRICT v4.1: org-scoped for tenant isolation
  // Supports dedupe queries and analytics by tenant
  await db
    .collection(COLLECTIONS.ERROR_EVENTS)
    .createIndex(
      { orgId: 1, incidentKey: 1 },
      {
        unique: true,
        background: true,
        name: "error_events_orgId_incidentKey_unique",
        partialFilterExpression: { orgId: { $exists: true }, incidentKey: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.ERROR_EVENTS)
    .createIndex(
      { tenantScope: 1, incidentKey: 1 },
      {
        unique: true,
        background: true,
        name: "error_events_tenantScope_incidentKey_unique",
        partialFilterExpression: { tenantScope: { $exists: true }, incidentKey: { $exists: true } },
      },
    );
  await db
    .collection(COLLECTIONS.ERROR_EVENTS)
    .createIndex(
      { orgId: 1, severity: 1, createdAt: -1 },
      {
        background: true,
        name: "error_events_orgId_severity_createdAt_desc",
      },
    );
  await db
    .collection(COLLECTIONS.ERROR_EVENTS)
    .createIndex(
      { createdAt: 1 },
      {
        background: true,
        name: "error_events_createdAt_ttl",
        expireAfterSeconds: 60 * 60 * 24 * 90, // 90 days retention
      },
    );

  // ============================================================================
  // TEXT INDEXES FOR GLOBAL SEARCH (app/api/search/route.ts)
  // STRICT v4.1: All text indexes must be org-scoped
  // ============================================================================

  // Properties text search
  await db
    .collection(COLLECTIONS.PROPERTIES)
    .createIndex(
      { orgId: 1, name: "text", description: "text", code: "text", "address.street": "text", "address.city": "text" },
      {
        background: true,
        name: "properties_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Invoices text search
  await db
    .collection(COLLECTIONS.INVOICES)
    .createIndex(
      { orgId: 1, number: "text", "customer.name": "text" },
      {
        background: true,
        name: "invoices_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Vendors text search
  await db
    .collection(COLLECTIONS.VENDORS)
    .createIndex(
      { orgId: 1, name: "text", email: "text", company: "text" },
      {
        background: true,
        name: "vendors_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Tenants text search
  await db
    .collection(COLLECTIONS.TENANTS)
    .createIndex(
      { orgId: 1, name: "text", email: "text", phone: "text" },
      {
        background: true,
        name: "tenants_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Units text search
  await db
    .collection(COLLECTIONS.UNITS)
    .createIndex(
      { orgId: 1, unitNumber: "text", type: "text" },
      {
        background: true,
        name: "units_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Services text search
  await db
    .collection(COLLECTIONS.SERVICES)
    .createIndex(
      { orgId: 1, name: "text", description: "text", category: "text" },
      {
        background: true,
        name: "services_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Projects text search (Aqar)
  await db
    .collection(COLLECTIONS.PROJECTS)
    .createIndex(
      { orgId: 1, name: "text", description: "text", location: "text" },
      {
        background: true,
        name: "projects_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Agents text search (Aqar)
  await db
    .collection(COLLECTIONS.AGENTS)
    .createIndex(
      { orgId: 1, name: "text", email: "text", phone: "text" },
      {
        background: true,
        name: "agents_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // RFQs text search
  await db
    .collection(COLLECTIONS.RFQS)
    .createIndex(
      { orgId: 1, title: "text", description: "text" },
      {
        background: true,
        name: "rfqs_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Orders (Claims) text search
  // TD-002: Use CLAIMS_ORDERS collection instead of legacy ORDERS
  await db
    .collection(COLLECTIONS.CLAIMS_ORDERS)
    .createIndex(
      { orgId: 1, orderNumber: "text", "customer.name": "text" },
      {
        background: true,
        name: "orders_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );

  // Souq Listings text search
  await db
    .collection(COLLECTIONS.SOUQ_LISTINGS)
    .createIndex(
      { orgId: 1, title: "text", description: "text" },
      {
        background: true,
        name: "souq_listings_orgId_text_search",
        partialFilterExpression: { orgId: { $exists: true } },
      },
    );
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

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

// Collection names
export const COLLECTIONS: Record<string, string> = {
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
  PROJECT_BIDS: "projectbids",
  REVIEWS: "reviews",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "auditLogs",
  // Admin + org
  ORGANIZATIONS: "organizations",
  ADMIN_NOTIFICATIONS: "admin_notifications",
  COMMUNICATION_LOGS: "communication_logs",
  EMAIL_LOGS: "email_logs",
  PAYMENTS: "payments",
  AQAR_PAYMENTS: "aqar_payments",
  // ATS module
  ATS_JOBS: "jobs",
  ATS_APPLICATIONS: "applications",
  ATS_INTERVIEWS: "interviews",
  ATS_CANDIDATES: "candidates",
  ATS_SETTINGS: "ats_settings",
  // Knowledge base / CMS
  HELP_ARTICLES: "helparticles",
  HELP_COMMENTS: "helpcomments",
  KB_EMBEDDINGS: "kb_embeddings",
  AI_KB: "ai_kb",
  CMS_PAGES: "cmspages",
  // Additional collections used in lib/queries.ts
  SUPPORT_TICKETS: "supporttickets",
  EMPLOYEES: "employees",
  ATTENDANCE: "attendances",
  CUSTOMERS: "customers",
  CONTRACTS: "contracts",
  ROLES: "roles",
  PERMISSIONS: "permissions",
  API_KEYS: "api_keys",
  INVOICE_COUNTERS: "invoice_counters",
  // Souq marketplace collections
  SOUQ_LISTINGS: "souq_listings",
  SOUQ_ORDERS: "souq_orders",
  SOUQ_REVIEWS: "souq_reviews",
  SOUQ_SETTLEMENTS: "souq_settlements",
  SOUQ_WITHDRAWAL_REQUESTS: "souq_withdrawal_requests",
  CLAIMS: "claims",
  SOUQ_CAMPAIGNS: "souq_campaigns",
  SOUQ_AD_GROUPS: "souq_ad_groups",
  SOUQ_ADS: "souq_ads",
  SOUQ_AD_TARGETS: "souq_ad_targets",
  SOUQ_FEE_SCHEDULES: "souq_fee_schedules",
  SOUQ_RMAS: "souq_rmas",
  SOUQ_REFUNDS: "souq_refunds",
  // QA collections
  QA_LOGS: "qa_logs",
  QA_ALERTS: "qa_alerts",
  // Errors / telemetry
  ERROR_EVENTS: "error_events",
  // Approvals / Assets / SLA / Agent audit
  FM_APPROVALS: "fm_approvals",
  ASSETS: "assets",
  SLAS: "slas",
  AGENT_AUDIT_LOGS: "agent_audit_logs",
  WORKORDER_TIMELINE: "workorder_timeline",
  WORKORDER_ATTACHMENTS: "workorder_attachments",
  UTILITY_BILLS: "utilitybills",
  OWNERS: "owners",
  CREDENTIALS: "credentials",
  ACCOUNTS: "accounts",
  // Search-related collections (used in app/api/search/route.ts)
  UNITS: "units",
  SERVICES: "services",
  PROJECTS: "projects",
  AGENTS: "agents",
  LISTINGS: "listings",
  RFQ_RESPONSES: "rfq_responses",
  // Subscription/billing collections
  SUBSCRIPTION_INVOICES: "subscriptioninvoices",
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
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orgId: 1, buyerUserId: 1, status: 1 }, { background: true, name: "orders_orgId_buyer_status" });
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orgId: 1, vendorId: 1, status: 1 }, { background: true, name: "orders_orgId_vendor_status" });
  await db
    .collection(COLLECTIONS.ORDERS)
    .createIndex({ orgId: 1, "source.workOrderId": 1 }, { background: true, name: "orders_orgId_source_workOrderId" });
  await db
    .collection(COLLECTIONS.ORDERS)
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
  await db
    .collection(COLLECTIONS.SUBSCRIPTION_INVOICES)
    .createIndex({ paytabsRef: 1 }, { background: true, sparse: true, name: "subscriptioninvoices_paytabsRef" });

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
  await db
    .collection(COLLECTIONS.SOUQ_ORDERS)
    .createIndex(
      { orgId: 1, "items.sellerId": 1, createdAt: -1 },
      { background: true, name: "souq_orders_orgId_seller_createdAt" },
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
      { orgId: 1, orderId: 1 },
      {
        unique: true,
        background: true,
        name: "souq_orders_orgId_orderId_unique",
        partialFilterExpression: { orgId: { $exists: true }, orderId: { $exists: true } },
      },
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

  // Orders text search
  await db
    .collection(COLLECTIONS.ORDERS)
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

async function createQaIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  // ============================================================================
  // QA LOGS - AUDIT-2025-12-04: Multi-tenant isolation, platform queries, and TTL
  // ============================================================================
  
  // Org-scoped query index (sparse to exclude legacy docs without orgId)
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex({ orgId: 1, timestamp: -1 }, { 
      name: "qa_logs_orgId_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // Event-specific org-scoped query index
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex({ orgId: 1, event: 1, timestamp: -1 }, { 
      name: "qa_logs_orgId_event_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // PLATFORM-FRIENDLY: Global timestamp index for platform admin queries (no orgId filter)
  // Supports: db.qa_logs.find({}).sort({timestamp:-1}) and db.qa_logs.find({event:x}).sort({timestamp:-1})
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex({ timestamp: -1 }, { 
      name: "qa_logs_timestamp_desc", 
      background: true 
    });
  
  // PLATFORM-FRIENDLY: Event + timestamp for platform admin event-filtered queries
  await db
    .collection(COLLECTIONS.QA_LOGS)
    .createIndex({ event: 1, timestamp: -1 }, { 
      name: "qa_logs_event_timestamp", 
      background: true 
    });
  
  // TTL index: Auto-delete qa_logs after 90 days to bound storage growth
  await db
    .collection(COLLECTIONS.QA_LOGS)
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
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex({ orgId: 1, timestamp: -1 }, { 
      name: "qa_alerts_orgId_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // Event-specific org-scoped query index (parity with qa_logs for event filtering)
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex({ orgId: 1, event: 1, timestamp: -1 }, { 
      name: "qa_alerts_orgId_event_timestamp", 
      background: true, 
      sparse: true 
    });
  
  // PLATFORM-FRIENDLY: Global timestamp index for platform admin queries (no orgId filter)
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex({ timestamp: -1 }, { 
      name: "qa_alerts_timestamp_desc", 
      background: true 
    });
  
  // PLATFORM-FRIENDLY: Event + timestamp for platform admin event-filtered queries
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex({ event: 1, timestamp: -1 }, { 
      name: "qa_alerts_event_timestamp", 
      background: true 
    });
  
  // TTL index: Auto-delete qa_alerts after 30 days to bound storage growth
  await db
    .collection(COLLECTIONS.QA_ALERTS)
    .createIndex({ timestamp: 1 }, { 
      name: "qa_alerts_ttl_30d", 
      expireAfterSeconds: 30 * 24 * 60 * 60,  // 30 days
      background: true 
    });
}

/**
 * Drop legacy user indexes that are either non-org-scoped or use default names,
 * so canonical org-scoped, named indexes can be created without collisions.
 */
async function dropLegacyUserIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const userIndexes = [
    // Global/non-org-scoped defaults
    "email_1",
    "phone_1",
    "username_1",
    "code_1",
    "employeeId_1",
    // Default-named orgId-prefixed variants (conflict with canonical named indexes)
    "orgId_1_email_1",
    "orgId_1_phone_1",
    "orgId_1_username_1",
    "orgId_1_code_1",
    "orgId_1_employeeId_1",
    "orgId_1_role_1",
    "orgId_1_professional.role_1",
    "orgId_1_professional.subRole_1",
    "orgId_1_personal.phone_1",
    "orgId_1_assignment.assignedTo.userId_1",
    "orgId_1_assignment.assignedTo.vendorId_1",
    // Performance-related default-named indexes that conflict with canonical names
    "orgId_1_professional.skills.category_1",
    "orgId_1_workload.available_1",
    "orgId_1_performance.rating_-1",
    "orgId_1_isSuperAdmin_1",
    // Legacy unique name that used a conflicting partialFilterExpression
    "users_orgId_employeeId_unique",
  ];

  for (const indexName of userIndexes) {
    try {
      await db.collection(COLLECTIONS.USERS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) {
        continue;
      }
      logger.warn("[indexes] Failed to drop legacy user index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy work order indexes that use default names and conflict with canonical named indexes.
 * This allows the canonical indexes (e.g., workorders_orgId_priority_slaStatus) to be created idempotently.
 */
async function dropLegacyWorkOrderIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const workOrderIndexes = [
    // Default-named orgId-prefixed compound indexes that conflict with canonical named versions
    "orgId_1_status_1",
    "orgId_1_priority_1",
    "orgId_1_priority_1_sla.status_1", // conflicts with workorders_orgId_priority_slaStatus
    "orgId_1_status_1_createdAt_-1", // conflicts with workorders_orgId_status_createdAt_desc
    "orgId_1_location.propertyId_1",
    "orgId_1_location.propertyId_1_status_1",
    "orgId_1_location.unitNumber_1_status_1",
    "orgId_1_assignment.assignedTo.userId_1",
    "orgId_1_assignment.assignedTo.vendorId_1",
    "orgId_1_requester.userId_1",
    "orgId_1_scheduledDate_1",
    "orgId_1_createdAt_-1",
    "orgId_1_updatedAt_-1",
    "orgId_1_category_1",
    "orgId_1_subCategory_1",
    "orgId_1_type_1",
    // SLA deadline indexes
    "sla.resolutionDeadline_1", // non-org-scoped legacy - conflicts with workorders_sla_resolutionDeadline
    // Text indexes - MongoDB only allows one text index per collection
    "orgId_1_title_text_description_text_work.solutionDescription_text",
    "title_text_description_text_work.solutionDescription_text", // non-org-scoped legacy text index
  ];

  for (const indexName of workOrderIndexes) {
    try {
      await db.collection(COLLECTIONS.WORK_ORDERS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) {
        continue;
      }
      logger.warn("[indexes] Failed to drop legacy work order index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy invoice indexes that use default names and conflict with canonical named indexes.
 * This allows the canonical indexes (e.g., invoices_orgId_status) to be created idempotently.
 */
async function dropLegacyInvoiceIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const invoiceIndexes = [
    // Default-named orgId-prefixed compound indexes that conflict with canonical named versions
    "orgId_1_status_1",
    "orgId_1_dueDate_1",
    "orgId_1_customerId_1",
    "orgId_1_issueDate_-1",
    "orgId_1_number_1",
    "orgId_1_recipient.customerId_1",
    "orgId_1_zatca.status_1",
    "orgId_1_type_1_status_1", // conflicts with invoices_orgId_type_status
  ];

  for (const indexName of invoiceIndexes) {
    try {
      await db.collection(COLLECTIONS.INVOICES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) {
        continue;
      }
      logger.warn("[indexes] Failed to drop legacy invoice index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy subscription invoice indexes that use default names and conflict with canonical named indexes.
 * This allows the canonical indexes (e.g., subscriptioninvoices_orgId_status_dueDate) to be created idempotently.
 */
async function dropLegacySubscriptionInvoiceIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const subscriptionInvoiceIndexes = [
    // Default-named orgId-prefixed compound indexes that conflict with canonical named versions
    "orgId_1_status_1_dueDate_1",
    "orgId_1_subscriptionId_1_dueDate_-1",
    "orgId_1_subscriptionId_1",
  ];

  for (const indexName of subscriptionInvoiceIndexes) {
    try {
      await db.collection(COLLECTIONS.SUBSCRIPTION_INVOICES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) {
        continue;
      }
      logger.warn("[indexes] Failed to drop legacy subscription invoice index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy asset indexes that use default names and conflict with canonical named indexes.
 * This allows the canonical indexes (e.g., assets_orgId_type) to be created idempotently.
 */
async function dropLegacyAssetIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const assetIndexes = [
    // Default-named orgId-prefixed compound indexes that conflict with canonical named versions
    "orgId_1_type_1",
    "orgId_1_status_1",
    "orgId_1_pmSchedule.nextPM_1",
    "orgId_1_condition.score_1", // conflicts with assets_orgId_conditionScore
    "orgId_1_code_1", // conflicts with assets_orgId_code_unique
    "orgId_1_location.propertyId_1",
    "orgId_1_location.unitId_1",
    "orgId_1_assignedTo_1",
    "orgId_1_serialNumber_1",
  ];

  for (const indexName of assetIndexes) {
    try {
      await db.collection(COLLECTIONS.ASSETS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) {
        continue;
      }
      logger.warn("[indexes] Failed to drop legacy asset index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy SLA indexes that use default names and conflict with canonical named indexes.
 * This allows the canonical indexes (e.g., slas_orgId_type) to be created idempotently.
 */
async function dropLegacySLAIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const slaIndexes = [
    // Default-named orgId-prefixed compound indexes that conflict with canonical named versions
    "orgId_1_type_1",
    "orgId_1_status_1",
    "orgId_1_priority_1",
    "orgId_1_code_1", // conflicts with slas_orgId_code_unique
    "orgId_1_isActive_1",
  ];

  for (const indexName of slaIndexes) {
    try {
      await db.collection(COLLECTIONS.SLAS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) {
        continue;
      }
      logger.warn("[indexes] Failed to drop legacy SLA index", {
        indexName,
        error: err?.message,
      });
    }
  }
}

/**
 * Drop legacy support ticket indexes that use default names and conflict with canonical named indexes.
 */
async function dropLegacySupportTicketIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const supportTicketIndexes = [
    "orgId_1_status_1",
    "orgId_1_priority_1",
    "orgId_1_assignment.assignedTo.userId_1",
    "orgId_1_createdAt_-1",
  ];

  for (const indexName of supportTicketIndexes) {
    try {
      await db.collection(COLLECTIONS.SUPPORT_TICKETS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy support ticket index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy FM approval indexes.
 */
async function dropLegacyFMApprovalIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const fmApprovalIndexes = [
    "orgId_1_approvalNumber_1",
    "orgId_1_status_1",
    "orgId_1_requestedBy.userId_1",
    "orgId_1_createdAt_-1",
  ];

  for (const indexName of fmApprovalIndexes) {
    try {
      await db.collection(COLLECTIONS.FM_APPROVALS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy FM approval index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy employee indexes.
 */
async function dropLegacyEmployeeIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const employeeIndexes = [
    "orgId_1_status_1",
    "orgId_1_department_1",
    "orgId_1_position_1",
    "orgId_1_employeeId_1",
    "orgId_1_email_1",
    "orgId_1_supervisorId_1",
    "orgId_1_hireDate_1",
    "orgId_1_terminationDate_1",
  ];

  for (const indexName of employeeIndexes) {
    try {
      await db.collection(COLLECTIONS.EMPLOYEES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy employee index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy error events indexes that conflict with canonical named indexes.
 */
async function dropLegacyErrorEventIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const errorEventIndexes = [
    "error_events_org_incidentKey", // legacy name, conflicts with error_events_orgId_incidentKey_unique
    "orgId_1_incidentKey_1",
    "orgId_1_createdAt_-1",
    "orgId_1_severity_1",
    "orgId_1_status_1",
  ];

  for (const indexName of errorEventIndexes) {
    try {
      await db.collection(COLLECTIONS.ERROR_EVENTS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy error event index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy claims indexes that were global or used default names.
 * Ensures org-scoped, named indexes can be created without IndexOptionsConflict.
 */
async function dropLegacyClaimIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const claimIndexes = [
    "claimId_1",
    "status_1_createdAt_-1",
    "buyerId_1_status_1",
    "sellerId_1_status_1",
    "sellerId_1_createdAt_-1",
    "sellerResponseDeadline_1_status_1",
    "assignedTo_1_status_1",
    "orgId_1_status_1",
    "orgId_1_claimId_1",
  ];

  for (const indexName of claimIndexes) {
    try {
      await db.collection(COLLECTIONS.CLAIMS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy claim index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy RMA indexes that were global or used default names.
 * Ensures org-scoped, named indexes can be created without IndexOptionsConflict.
 */
async function dropLegacyRmaIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const rmaIndexes = [
    "rmaId_1",
    "status_1_createdAt_-1",
    "buyerId_1_status_1",
    "sellerId_1_status_1",
    "sellerId_1_createdAt_-1",
    "returnDeadline_1",
    "orgId_1_status_1",
    "orgId_1_rmaId_1",
  ];

  for (const indexName of rmaIndexes) {
    try {
      await db.collection(COLLECTIONS.SOUQ_RMAS).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy RMA index", { indexName, error: err?.message });
    }
  }
}

/**
 * Drop legacy advertising indexes to allow org-scoped named indexes.
 */
async function dropLegacyAdvertisingIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const targets: Array<{ collection: string; indexes: string[] }> = [
    {
      collection: COLLECTIONS.SOUQ_CAMPAIGNS,
      indexes: [
        "campaignId_1",
        "sellerId_1_status_1",
        "startAt_1_endAt_1",
        "stats.spend_-1",
        "orgId_1_campaignId_1",
      ],
    },
    {
      collection: COLLECTIONS.SOUQ_AD_GROUPS,
      indexes: ["adGroupId_1", "campaignId_1_status_1", "orgId_1_adGroupId_1"],
    },
    {
      collection: COLLECTIONS.SOUQ_ADS,
      indexes: ["adId_1", "adGroupId_1_status_1", "productId_1_status_1", "qualityScore_-1", "orgId_1_adId_1"],
    },
    {
      collection: COLLECTIONS.SOUQ_AD_TARGETS,
      indexes: [
        "targetId_1",
        "adGroupId_1_status_1_isNegative_1",
        "targetType_1_status_1",
        "keyword_1_matchType_1",
        "orgId_1_targetId_1",
      ],
    },
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
        logger.warn("[indexes] Failed to drop legacy advertising index", { collection, indexName, error: err?.message });
      }
    }
  }
}

/**
 * Drop legacy fee schedule indexes to allow org-scoped named indexes.
 */
async function dropLegacyFeeScheduleIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const feeIndexes = [
    "feeScheduleId_1",
    "version_1",
    "isActive_1_effectiveFrom_-1",
    "orgId_1_feeScheduleId_1",
  ];

  for (const indexName of feeIndexes) {
    try {
      await db.collection(COLLECTIONS.SOUQ_FEE_SCHEDULES).dropIndex(indexName);
    } catch (error) {
      const err = error as { code?: number; codeName?: string; message?: string };
      const isMissing =
        err?.code === 27 ||
        err?.codeName === "IndexNotFound" ||
        err?.message?.includes("index not found");
      if (isMissing) continue;
      logger.warn("[indexes] Failed to drop legacy fee schedule index", { indexName, error: err?.message });
    }
  }
}

async function dropLegacyGlobalUniqueIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const targets: Array<{ collection: string; indexes: string[] }> = [
    { collection: COLLECTIONS.USERS, indexes: ["email_1"] },
    {
      collection: COLLECTIONS.PROPERTIES,
      indexes: [
        "code_1",
        // Legacy non-partial unique
        "orgId_1_code_1",
        // Legacy default-named secondary indexes that collide with canonical names
        "orgId_1_type_1",
        "orgId_1_status_1",
        "orgId_1_address.city_1",
        "orgId_1_units.status_1",
      ],
    },
    // Also drop stale assignedTo index (field never existed - correct path is assignment.assignedTo.userId)
    {
      collection: COLLECTIONS.WORK_ORDERS,
      indexes: [
        "code_1",
        "workOrderNumber_1",
        // Drop canonical-named unique index to allow recreation with updated partial filters
        "workorders_orgId_workOrderNumber_unique",
        "orgId_1_assignedTo_1_status_1",
        "orgId_1_status_1",
        "orgId_1_priority_1",
        "orgId_1_priority_1_sla.status_1", // Mongoose auto-created, conflicts with workorders_orgId_priority_slaStatus
        "orgId_1_location.propertyId_1",
        "orgId_1_location.unitNumber_1_status_1",
        "orgId_1_assignment.assignedTo.userId_1",
        "orgId_1_assignment.assignedTo.vendorId_1",
        "createdAt_-1",
        "orgId_1_title_text_description_text_work.solutionDescription_text",
      ],
    },
    // Drop old non-org-scoped text index (replaced with products_orgId_text_search)
    { collection: COLLECTIONS.PRODUCTS, indexes: ["sku_1", "products_text_search"] },
    { collection: COLLECTIONS.ORDERS, indexes: ["orderNumber_1"] },
    { collection: COLLECTIONS.INVOICES, indexes: ["invoiceNumber_1", "number_1", "code_1"] },
    { collection: "supporttickets", indexes: ["code_1", "orgId_1_code_1"] },
    { collection: COLLECTIONS.HELP_ARTICLES, indexes: ["slug_1", "orgId_1_slug_1"] },
    { collection: COLLECTIONS.CMS_PAGES, indexes: ["slug_1", "orgId_1_slug_1"] },
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

/**
 * Drop legacy QA indexes that conflict with TTL/org-scoped definitions.
 * Older seeds had a bare timestamp index without TTL and different names.
 */
async function dropLegacyQaIndexes(db: Awaited<ReturnType<typeof getDatabase>>) {
  const qaTargets: Array<{ collection: string; indexes: string[] }> = [
    { collection: "qa_logs", indexes: ["timestamp_1", "event_1_timestamp_-1"] },
    { collection: "qa_alerts", indexes: ["timestamp_1", "event_1_timestamp_-1"] },
  ];

  for (const { collection, indexes } of qaTargets) {
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
        logger.warn(`[indexes] Failed to drop legacy QA index`, {
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

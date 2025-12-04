// MongoDB Queries Library - Server-Side Only
// All queries MUST include orgId for multi-tenant isolation
// Use these in Server Components, Server Actions, or API Routes only
// AUDIT-2025-11-29: Standardized from org_id to orgId
// AUDIT-2025-12-04: Fixed collection names to use COLLECTIONS constant

import { getDatabase } from "./mongodb-unified";
import { COLLECTIONS, createIndexes } from "./db/collections";

// Alias for consistency
const getDb = getDatabase;
type MongoDb = Awaited<ReturnType<typeof getDb>>;

// ==========================================
// WORK ORDERS MODULE
// ==========================================

/**
 * Get SLA Watchlist - Work orders nearing SLA deadline
 */
export async function getSLAWatchlist(orgId: string, limit = 50) {
  const db = await getDb();
  return db
    .collection(COLLECTIONS.WORK_ORDERS)
    .aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ["Open", "In Progress", "Pending Approval"] },
          sla_due: { $exists: true },
        },
      },
      {
        $addFields: {
          hours_remaining: {
            $divide: [{ $subtract: ["$sla_due", new Date()] }, 3600000],
          },
        },
      },
      { $match: { hours_remaining: { $lt: 24, $gt: 0 } } },
      { $sort: { sla_due: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          wo_number: 1,
          title: 1,
          priority: 1,
          status: 1,
          assignee: 1,
          sla_due: 1,
          hours_remaining: 1,
          property: 1,
          created_at: 1,
        },
      },
    ])
    .toArray();
}

/**
 * Get work order statistics
 */
export async function getWorkOrderStats(orgId: string) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.WORK_ORDERS);

  const [total, open, inProgress, overdue, completed] = await Promise.all([
    collection.countDocuments({ orgId: orgId, isDeleted: { $ne: true } }),
    collection.countDocuments({
      orgId: orgId,
      isDeleted: { $ne: true },
      status: { $in: ["SUBMITTED", "ASSIGNED"] },
    }),
    collection.countDocuments({
      orgId: orgId,
      isDeleted: { $ne: true },
      status: "IN_PROGRESS",
    }),
    collection.countDocuments({
      orgId: orgId,
      isDeleted: { $ne: true },
      status: { $in: ["ASSIGNED", "IN_PROGRESS", "PENDING_APPROVAL"] },
      "sla.resolutionDeadline": { $lt: new Date() },
    }),
    collection.countDocuments({
      orgId: orgId,
      isDeleted: { $ne: true },
      status: { $in: ["COMPLETED", "VERIFIED", "CLOSED"] },
    }),
  ]);

  return {
    total,
    open,
    inProgress,
    overdue,
    completed,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : "0",
  };
}

// ==========================================
// FINANCE MODULE
// ==========================================

/**
 * Get invoice counters
 */
export async function getInvoiceCounters(orgId: string) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.INVOICES);

  const [unpaid, overdue, paid, total] = await Promise.all([
    collection.countDocuments({ orgId: orgId, status: { $in: ["ISSUED", "OVERDUE"] } }),
    collection.countDocuments({
      orgId: orgId,
      status: { $in: ["ISSUED", "OVERDUE"] },
      dueDate: { $lt: new Date() },
    }),
    collection.countDocuments({ orgId: orgId, status: "PAID" }),
    collection.countDocuments({ orgId: orgId }),
  ]);

  return { unpaid, overdue, paid, total };
}

/**
 * Get revenue statistics
 */
export async function getRevenueStats(orgId: string, days = 30) {
  const db = await getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await db
    .collection(COLLECTIONS.INVOICES)
    .aggregate([
      {
        $match: {
          orgId: orgId,
          status: "PAID",
          paidAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$total", "$total_amount"] } },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return {
    total: result[0]?.total || 0,
    count: result[0]?.count || 0,
    currency: "SAR",
  };
}

// ==========================================
// HR MODULE
// ==========================================

/**
 * Get employee counters
 */
export async function getEmployeeCounters(orgId: string) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.EMPLOYEES);

  const [total, active, onLeave, probation] = await Promise.all([
    collection.countDocuments({ orgId: orgId }),
    collection.countDocuments({ orgId: orgId, status: "Active" }),
    collection.countDocuments({ orgId: orgId, status: "On Leave" }),
    collection.countDocuments({ orgId: orgId, status: "Probation" }),
  ]);

  return { total, active, onLeave, probation };
}

/**
 * Get attendance summary
 */
export async function getAttendanceSummary(orgId: string) {
  const db = await getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .collection(COLLECTIONS.ATTENDANCE)
    .aggregate([
      {
        $match: {
          orgId: orgId,
          date: { $gte: today },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  interface AttendanceSummaryResult {
    _id: string;
    count: number;
  }

  const summary: Record<string, number> = {};
  (result as unknown as AttendanceSummaryResult[]).forEach(
    (item: AttendanceSummaryResult) => {
      summary[item._id] = item.count;
    },
  );

  return {
    present: summary.present || 0,
    absent: summary.absent || 0,
    late: summary.late || 0,
    onLeave: summary.on_leave || 0,
  };
}

// ==========================================
// PROPERTIES MODULE
// ==========================================

/**
 * Get property counters
 */
export async function getPropertyCounters(orgId: string) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.PROPERTIES);

  const [total, active, maintenance, leased] = await Promise.all([
    collection.countDocuments({ orgId: orgId }),
    collection.countDocuments({ orgId: orgId, status: "Active" }),
    collection.countDocuments({ orgId: orgId, status: "Under Maintenance" }),
    collection.countDocuments({ orgId: orgId, lease_status: "Leased" }),
  ]);

  const occupancyRate = total > 0 ? ((leased / total) * 100).toFixed(1) : "0";

  return { total, active, maintenance, leased, occupancyRate };
}

// ==========================================
// CRM MODULE
// ==========================================

/**
 * Get customer counters
 */
export async function getCustomerCounters(orgId: string) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.CUSTOMERS);

  const [total, active, leads, contracts] = await Promise.all([
    collection.countDocuments({ orgId: orgId }),
    collection.countDocuments({ orgId: orgId, status: "Active" }),
    collection.countDocuments({ orgId: orgId, type: "Lead" }),
    db
      .collection(COLLECTIONS.CONTRACTS)
      .countDocuments({ orgId: orgId, status: "Active" }),
  ]);

  return { total, active, leads, contracts };
}

// ==========================================
// SUPPORT MODULE
// ==========================================

/**
 * Get support ticket counters
 */
export async function getSupportCounters(orgId: string) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.SUPPORT_TICKETS);

  const [total, open, pending, resolved] = await Promise.all([
    collection.countDocuments({ orgId: orgId }),
    collection.countDocuments({ orgId: orgId, status: "Open" }),
    collection.countDocuments({ orgId: orgId, status: "Pending" }),
    collection.countDocuments({ orgId: orgId, status: "Resolved" }),
  ]);

  return { total, open, pending, resolved };
}

// ==========================================
// SOUQ MARKETPLACE MODULE
// ==========================================

/**
 * Get marketplace counters (for sellers)
 */
export async function getMarketplaceCounters(orgId: string, sellerId: string) {
  const db = await getDb();

  const [listings, orders, reviews, activeListings] = await Promise.all([
    db.collection(COLLECTIONS.SOUQ_LISTINGS).countDocuments({ orgId, sellerId }),
    db
      .collection(COLLECTIONS.SOUQ_ORDERS)
      .countDocuments({ orgId, "items.sellerId": sellerId }),
    db.collection(COLLECTIONS.SOUQ_REVIEWS).countDocuments({
      orgId,
      productId: { $in: await getSellerProductIds(orgId, sellerId, db) },
    }),
    db
      .collection(COLLECTIONS.SOUQ_LISTINGS)
      .countDocuments({ orgId, sellerId, status: "active" }),
  ]);

  return { listings, activeListings, orders, reviews };
}

/**
 * Get marketplace counters for entire organization (admin dashboard)
 * ✅ FIXED: Implements org-level aggregation with proper tenant isolation
 */
export async function getMarketplaceCountersForOrg(orgId: string) {
  const db = await getDb();

  const [listings, orders, reviews] = await Promise.all([
    db.collection(COLLECTIONS.SOUQ_LISTINGS).countDocuments({ orgId }), // ✅ Tenant-scoped
    db.collection(COLLECTIONS.SOUQ_ORDERS).countDocuments({ orgId }), // ✅ Tenant-scoped
    db.collection(COLLECTIONS.SOUQ_REVIEWS).countDocuments({ orgId }), // ✅ Tenant-scoped
  ]);

  return { listings, orders, reviews };
}

async function getSellerProductIds(
  orgId: string,
  sellerId: string,
  db: MongoDb,
): Promise<unknown[]> {
  const listings = await db
    .collection(COLLECTIONS.SOUQ_LISTINGS)
    .find({ orgId, sellerId })
    .project({ productId: 1 })
    .toArray();
  return listings.map((l) => l.productId);
}

// ==========================================
// ADMIN MODULE
// ==========================================

/**
 * Get system-wide counters (admin only)
 */
export async function getSystemCounters(orgId: string) {
  const db = await getDb();

  const [users, roles, tenants, apiKeys] = await Promise.all([
    db.collection(COLLECTIONS.USERS).countDocuments({ orgId }),
    db.collection(COLLECTIONS.ROLES).countDocuments({ orgId }),
    db.collection(COLLECTIONS.TENANTS).countDocuments({ orgId }),
    db.collection(COLLECTIONS.API_KEYS).countDocuments({ orgId, status: "Active" }),
  ]);

  return { users, roles, tenants, apiKeys };
}

// ==========================================
// DASHBOARD KPIs
// ==========================================

/**
 * Get all counters for dashboard (optimized single call)
 */
export async function getAllCounters(orgId: string) {
  const [
    workOrders,
    invoices,
    employees,
    properties,
    customers,
    support,
    marketplace,
    system,
  ] = await Promise.all([
    getWorkOrderStats(orgId),
    getInvoiceCounters(orgId),
    getEmployeeCounters(orgId),
    getPropertyCounters(orgId),
    getCustomerCounters(orgId),
    getSupportCounters(orgId),
    getMarketplaceCountersForOrg(orgId),
    getSystemCounters(orgId),
  ]);

  return {
    workOrders,
    finance: invoices,
    hr: employees,
    invoices, // ✅ Add key expected by client
    employees, // ✅ Add key expected by client
    properties,
    crm: customers,
    customers, // ✅ Add key expected by client
    support,
    marketplace,
    system, // ✅ Add system counters
    lastUpdated: new Date().toISOString(),
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @deprecated Use createIndexes() from lib/db/collections instead.
 * Backward-compatible shim to avoid IndexOptionsConflict drift.
 */
export async function createPerformanceIndexes() {
  // Delegates to centralized index management to prevent drift and IndexOptionsConflict.
  await createIndexes();
}

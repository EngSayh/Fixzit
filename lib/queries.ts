// MongoDB Queries Library - Server-Side Only
// All queries MUST include org_id for multi-tenant isolation
// Use these in Server Components, Server Actions, or API Routes only

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getDatabase } from './mongodb-unified';
import type { Db } from 'mongodb';

// Alias for consistency
const getDb = getDatabase;

// ==========================================
// WORK ORDERS MODULE
// ==========================================

/**
 * Get SLA Watchlist - Work orders nearing SLA deadline
 */
export async function getSLAWatchlist(orgId: string, limit = 50) {
  const db = await getDb();
  return db
    .collection('work_orders')
    .aggregate([
      {
        $match: {
          org_id: orgId,
          status: { $in: ['Open', 'In Progress', 'Pending Approval'] },
          sla_due: { $exists: true },
        },
      },
      {
        $addFields: {
          hours_remaining: {
            $divide: [{ $subtract: ['$sla_due', new Date()] }, 3600000],
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
  const collection = db.collection('work_orders');

  const [total, open, inProgress, overdue, completed] = await Promise.all([
    collection.countDocuments({ org_id: orgId }),
    collection.countDocuments({ org_id: orgId, status: 'Open' }),
    collection.countDocuments({ org_id: orgId, status: 'In Progress' }),
    collection.countDocuments({
      org_id: orgId,
      status: { $in: ['Open', 'In Progress'] },
      sla_due: { $lt: new Date() },
    }),
    collection.countDocuments({ org_id: orgId, status: 'Completed' }),
  ]);

  return {
    total,
    open,
    inProgress,
    overdue,
    completed,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
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
  const collection = db.collection('invoices');

  const [unpaid, overdue, paid, total] = await Promise.all([
    collection.countDocuments({ org_id: orgId, status: 'Unpaid' }),
    collection.countDocuments({
      org_id: orgId,
      status: 'Unpaid',
      due_date: { $lt: new Date() },
    }),
    collection.countDocuments({ org_id: orgId, status: 'Paid' }),
    collection.countDocuments({ org_id: orgId }),
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
    .collection('invoices')
    .aggregate([
      {
        $match: {
          org_id: orgId,
          status: 'Paid',
          paid_date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total_amount' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  return {
    total: result[0]?.total || 0,
    count: result[0]?.count || 0,
    currency: 'SAR',
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
  const collection = db.collection('employees');

  const [total, active, onLeave, probation] = await Promise.all([
    collection.countDocuments({ org_id: orgId }),
    collection.countDocuments({ org_id: orgId, status: 'Active' }),
    collection.countDocuments({ org_id: orgId, status: 'On Leave' }),
    collection.countDocuments({ org_id: orgId, status: 'Probation' }),
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
    .collection('attendance')
    .aggregate([
      {
        $match: {
          org_id: orgId,
          date: { $gte: today },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const summary: Record<string, number> = {};
  result.forEach((item: { _id: string; count: number }) => {
    summary[item._id] = item.count;
  });

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
  const collection = db.collection('properties');

  const [total, active, maintenance, leased] = await Promise.all([
    collection.countDocuments({ org_id: orgId }),
    collection.countDocuments({ org_id: orgId, status: 'Active' }),
    collection.countDocuments({ org_id: orgId, status: 'Under Maintenance' }),
    collection.countDocuments({ org_id: orgId, lease_status: 'Leased' }),
  ]);

  const occupancyRate = total > 0 ? ((leased / total) * 100).toFixed(1) : '0';

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
  const collection = db.collection('customers');

  const [total, active, leads, contracts] = await Promise.all([
    collection.countDocuments({ org_id: orgId }),
    collection.countDocuments({ org_id: orgId, status: 'Active' }),
    collection.countDocuments({ org_id: orgId, type: 'Lead' }),
    db.collection('contracts').countDocuments({ org_id: orgId, status: 'Active' }),
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
  const collection = db.collection('support_tickets');

  const [total, open, pending, resolved] = await Promise.all([
    collection.countDocuments({ org_id: orgId }),
    collection.countDocuments({ org_id: orgId, status: 'Open' }),
    collection.countDocuments({ org_id: orgId, status: 'Pending' }),
    collection.countDocuments({ org_id: orgId, status: 'Resolved' }),
  ]);

  return { total, open, pending, resolved };
}

// ==========================================
// SOUQ MARKETPLACE MODULE
// ==========================================

/**
 * Get marketplace counters (for sellers)
 */
export async function getMarketplaceCounters(sellerId: string) {
  const db = await getDb();

  const [listings, orders, reviews, activeListings] = await Promise.all([
    db.collection('souq_listings').countDocuments({ sellerId }),
    db.collection('souq_orders').countDocuments({ 'items.sellerId': sellerId }),
    db
      .collection('souq_reviews')
      .countDocuments({ productId: { $in: await getSellerProductIds(sellerId, db) } }),
    db.collection('souq_listings').countDocuments({ sellerId, status: 'active' }),
  ]);

  return { listings, activeListings, orders, reviews };
}

async function getSellerProductIds(sellerId: string, db: Db): Promise<string[]> {
  const listings = await db
    .collection('souq_listings')
    .find({ sellerId })
    .project({ productId: 1 })
    .toArray();
  return listings.map((l) => l.productId.toString());
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
    db.collection('users').countDocuments({ org_id: orgId }),
    db.collection('roles').countDocuments({ org_id: orgId }),
    db.collection('tenants').countDocuments({ org_id: orgId }),
    db.collection('api_keys').countDocuments({ org_id: orgId, status: 'Active' }),
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
  const [workOrders, invoices, employees, properties, customers, support] = await Promise.all([
    getWorkOrderStats(orgId),
    getInvoiceCounters(orgId),
    getEmployeeCounters(orgId),
    getPropertyCounters(orgId),
    getCustomerCounters(orgId),
    getSupportCounters(orgId),
  ]);

  return {
    workOrders,
    finance: invoices,
    hr: employees,
    properties,
    crm: customers,
    support,
    lastUpdated: new Date().toISOString(),
  };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Create indexes for performance (run once on setup)
 */
export async function createPerformanceIndexes() {
  const db = await getDb();

  const indexes: Array<{ collection: string; index: Record<string, 1 | -1> }> = [
    // Work Orders
    { collection: 'work_orders', index: { org_id: 1, status: 1, sla_due: 1 } },
    { collection: 'work_orders', index: { org_id: 1, created_at: -1 } },

    // Invoices
    { collection: 'invoices', index: { org_id: 1, status: 1, due_date: 1 } },
    { collection: 'invoices', index: { org_id: 1, paid_date: -1 } },

    // Employees
    { collection: 'employees', index: { org_id: 1, status: 1 } },

    // Properties
    { collection: 'properties', index: { org_id: 1, status: 1, lease_status: 1 } },

    // Souq
    { collection: 'souq_listings', index: { sellerId: 1, status: 1 } },
    { collection: 'souq_orders', index: { 'items.sellerId': 1, createdAt: -1 } },
  ];

  for (const { collection, index } of indexes) {
    try {
      await db.collection(collection).createIndex(index);
      console.log(`✅ Created index on ${collection}:`, index);
    } catch (error) {
      console.error(`❌ Failed to create index on ${collection}:`, error);
    }
  }
}

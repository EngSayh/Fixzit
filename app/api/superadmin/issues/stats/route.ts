/**
 * @fileoverview Superadmin Issues Stats API - Aggregated Statistics
 *
 * Provides aggregated statistics for BacklogIssue collection (PENDING_MASTER.md imports).
 *
 * @security Requires superadmin session (getSuperadminSession)
 * @see {@link /server/models/BacklogIssue.ts} for issue schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { connectMongo } from '@/lib/db/mongoose';
import { audit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import BacklogIssue from '@/server/models/BacklogIssue';

/**
 * GET /api/superadmin/issues/stats - Get aggregated issue statistics
 *
 * @param {NextRequest} req - Next.js request object
 *
 * @returns {Promise<NextResponse>} JSON response with aggregated stats
 * @returns {200} Success - { total, totalOpen, totalClosed, healthScore, byStatus, byPriority, byCategory, quickWins, stale, blocked, recentlyResolved }
 * @returns {401} Unauthorized - Superadmin session required
 *
 * @example
 * GET /api/superadmin/issues/stats
 * // Returns: { total: 50, totalOpen: 30, totalClosed: 20, healthScore: 60, ... }
 *
 * @security
 * - Requires valid superadmin session
 * - Cache-Control: no-store for live data
 */
export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectMongo();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    total,
    statusAgg,
    priorityAgg,
    categoryAgg,
    quickWinsCount,
    staleCount,
    recentlyResolvedCount,
  ] = await Promise.all([
    // Total count
    BacklogIssue.countDocuments({}),

    // By status (AUDIT-2025-12-19: Added maxTimeMS)
    BacklogIssue.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ], { maxTimeMS: 10_000 }),

    // By priority
    BacklogIssue.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ], { maxTimeMS: 10_000 }),

    // By category
    BacklogIssue.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ], { maxTimeMS: 10_000 }),

    // Quick wins: XS/S effort, not resolved
    BacklogIssue.countDocuments({
      effort: { $in: ['XS', 'S'] },
      status: { $nin: ['resolved', 'wont_fix'] },
    }),

    // Stale: not updated in 30 days, still pending
    BacklogIssue.countDocuments({
      status: 'pending',
      updatedAt: { $lt: thirtyDaysAgo },
    }),

    // Recently resolved: resolved in last 7 days
    BacklogIssue.countDocuments({
      status: 'resolved',
      updatedAt: { $gte: sevenDaysAgo },
    }),
  ]);

  // Convert aggregation results to objects
  const byStatus: Record<string, number> = {};
  for (const item of statusAgg) {
    // Map 'pending' to 'open' for UI compatibility
    const statusKey = item._id === 'pending' ? 'open' : item._id;
    byStatus[statusKey] = item.count;
  }

  const byPriority: Record<string, number> = {};
  for (const item of priorityAgg) {
    byPriority[item._id] = item.count;
  }

  const byCategory: Record<string, number> = {};
  for (const item of categoryAgg) {
    byCategory[item._id] = item.count;
  }

  // Calculate totals
  const totalOpen = (byStatus.open || 0) + (byStatus.in_progress || 0);
  const totalClosed = (byStatus.resolved || 0) + (byStatus.wont_fix || 0);

  // Health score: % of issues resolved (0-100)
  const healthScore = total > 0 ? Math.round((totalClosed / total) * 100) : 100;

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  void audit({
    actorId: session.username,
    actorEmail: session.username,
    actorRole: session.role,
    action: "superadmin.issues.stats.read",
    targetType: "backlog_issue",
    orgId: session.orgId,
    ipAddress: clientIp,
    success: true,
    meta: {
      scope: "global",
      source: "backlog_issues",
    },
  }).catch((auditError) => {
    logger.warn("[Superadmin] Issues stats audit failed", { error: auditError });
  });

  return NextResponse.json({
    total,
    totalOpen,
    totalClosed,
    healthScore,
    byStatus,
    byPriority,
    byCategory,
    quickWins: quickWinsCount,
    stale: staleCount,
    blocked: 0, // BacklogIssue doesn't have blocked status
    recentlyResolved: recentlyResolvedCount,
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

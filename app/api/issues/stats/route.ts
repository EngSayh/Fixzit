/**
 * Issues Stats API Route Handler
 * GET /api/issues/stats - Get aggregated issue statistics
 * 
 * @module app/api/issues/stats/route
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  Issue,
  IssuePriority,
  IssueStatus,
  IssueEffort,
} from "@/server/models/Issue";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";
import { getSuperadminSession } from "@/lib/superadmin/auth";

async function resolveStatsSession(request: NextRequest) {
  const superadmin = await getSuperadminSession(request);
  if (superadmin) {
    return {
      ok: true as const,
      session: {
        id: superadmin.username,
        role: "super_admin",
        orgId: superadmin.orgId,
        email: superadmin.username,
        isSuperAdmin: true,
      },
    };
  }
  return getSessionOrNull(request);
}

const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" } as const;

/**
 * Canonical admin roles that can access the issue tracker
 * Uses uppercase values to match UserRole enum
 * Includes DEVELOPER for issue creation/management workflow
 */
const ISSUE_TRACKER_ALLOWED_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CORPORATE_ADMIN',
  'MANAGER',
  'DEVELOPER',
]);

/**
 * Check if a role is allowed to access the issue tracker
 * Handles both lowercase (superadmin session) and uppercase (normal session)
 */
function isAllowedRole(role: string): boolean {
  const normalized = role.toUpperCase();
  return ISSUE_TRACKER_ALLOWED_ROLES.has(normalized);
}

// ============================================================================
// GET /api/issues/stats
// ============================================================================

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute for stats aggregation
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "issues:stats",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await resolveStatsSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: ROBOTS_HEADER });
    }
    
    // Check for allowed roles (handles both lowercase superadmin and uppercase normal roles)
    if (!isAllowedRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden - insufficient role' }, { status: 403, headers: ROBOTS_HEADER });
    }
    
    await connectToDatabase();
    
    // Validate orgId before ObjectId conversion to prevent server crashes
    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[FIXZIT-API-003] Invalid or missing orgId in session (stats)", {
        hasOrgId: !!session.orgId,
      });
      return NextResponse.json(
        {
          error: {
            code: "FIXZIT-API-003",
            message: "Invalid organization ID",
            details: "Session contains an invalid or missing organization identifier.",
          },
        },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }
    
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Run all aggregations in parallel
    const [
      statusCounts,
      priorityCounts,
      categoryCounts,
      effortCounts,
      moduleCounts,
      fileCounts,
      quickWinsCount,
      staleCount,
      sprintReadyCount,
      blockedCount,
      recentlyResolved,
      timeline,
    ] = await Promise.all([
      // Status breakdown (AUDIT-2025-12-18: Added maxTimeMS)
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ], { maxTimeMS: 10_000 }),
      
      // Priority breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ], { maxTimeMS: 10_000 }),
      
      // Category breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ], { maxTimeMS: 10_000 }),
      
      // Effort breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$effort', count: { $sum: 1 } } },
      ], { maxTimeMS: 10_000 }),
      
      // Module breakdown (top 10)
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ], { maxTimeMS: 10_000 }),
      
      // Top files with open issues
      Issue.aggregate([
        { 
          $match: { 
            orgId,
            status: { $in: [
              IssueStatus.OPEN,
              IssueStatus.IN_PROGRESS,
              IssueStatus.IN_REVIEW,
              IssueStatus.BLOCKED,
            ]},
          },
        },
        { $group: { _id: '$location.filePath', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ], { maxTimeMS: 10_000 }),
      
      // Quick wins (XS/S effort, P1/P2 priority, open, not blocked)
      Issue.countDocuments({
        orgId,
        status: IssueStatus.OPEN,
        effort: { $in: [IssueEffort.XS, IssueEffort.S] },
        priority: { $in: [IssuePriority.P1_HIGH, IssuePriority.P2_MEDIUM] },
        blockedBy: { $exists: false },
      }),
      
      // Stale issues (open, not updated in 7 days)
      Issue.countDocuments({
        orgId,
        status: IssueStatus.OPEN,
        updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      
      // Sprint ready
      Issue.countDocuments({
        orgId,
        sprintReady: true,
        status: IssueStatus.OPEN,
        blockedBy: { $exists: false },
      }),
      
      // Blocked issues
      Issue.countDocuments({
        orgId,
        status: IssueStatus.BLOCKED,
      }),
      
      // Recently resolved (last 7 days)
      Issue.countDocuments({
        orgId,
        status: { $in: [IssueStatus.RESOLVED, IssueStatus.CLOSED] },
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      
      // Timeline (issues created per day, last 30 days)
      Issue.aggregate([
        {
          $match: {
            orgId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            created: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ], { maxTimeMS: 10_000 }),
    ]);
    
    // Transform aggregation results to objects
    const byStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      byStatus[item._id || 'unknown'] = item.count;
    }
    
    const byPriority: Record<string, number> = {};
    for (const item of priorityCounts) {
      byPriority[item._id || 'unknown'] = item.count;
    }
    
    const byCategory: Record<string, number> = {};
    for (const item of categoryCounts) {
      byCategory[item._id || 'unknown'] = item.count;
    }
    
    const byEffort: Record<string, number> = {};
    for (const item of effortCounts) {
      byEffort[item._id || 'unknown'] = item.count;
    }
    
    const byModule: Record<string, number> = {};
    for (const item of moduleCounts) {
      byModule[item._id || 'unknown'] = item.count;
    }
    
    const topLocations = fileCounts.map((item: any) => ({
      filePath: item._id || 'unknown',
      count: item.count,
    }));
    
    // Calculate totals
    const totalOpen = (byStatus[IssueStatus.OPEN] || 0) + 
                      (byStatus[IssueStatus.IN_PROGRESS] || 0) +
                      (byStatus[IssueStatus.IN_REVIEW] || 0) +
                      (byStatus[IssueStatus.BLOCKED] || 0);
    
    const totalClosed = (byStatus[IssueStatus.RESOLVED] || 0) +
                        (byStatus[IssueStatus.CLOSED] || 0) +
                        (byStatus[IssueStatus.WONT_FIX] || 0);
    
    const total = totalOpen + totalClosed;
    
    // Calculate health score (0-100)
    const criticalWeight = (byPriority[IssuePriority.P0_CRITICAL] || 0) * 4;
    const highWeight = (byPriority[IssuePriority.P1_HIGH] || 0) * 2;
    const blockedWeight = blockedCount * 3;
    const staleWeight = staleCount * 1.5;
    
    const negativeScore = criticalWeight + highWeight + blockedWeight + staleWeight;
    const healthScore = Math.max(0, Math.min(100, 100 - negativeScore));
    
    const stats = {
      total,
      totalOpen,
      totalClosed,
      healthScore: Math.round(healthScore),
      
      byStatus,
      byPriority,
      byCategory,
      byEffort,
      byModule,
      topLocations,
      
      quickWins: quickWinsCount,
      stale: staleCount,
      sprintReady: sprintReadyCount,
      blocked: blockedCount,
      recentlyResolved,
      
      timeline: timeline.map(t => ({
        date: t._id,
        created: t.created,
      })),
      
      generatedAt: new Date().toISOString(),
    };
    
    logger.info('[Issues Stats] Generated stats', { orgId: session.orgId, total });
    
    return NextResponse.json(stats, { headers: ROBOTS_HEADER });
    
  } catch (error) {
    const correlationId =
      error && typeof error === "object" && "correlationId" in error
        ? (error as { correlationId?: string }).correlationId
        : undefined;
    logger.error("[Issues Stats] Error fetching stats", {
      error,
      correlationId,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch issue stats",
        ...(correlationId ? { correlationId } : {}),
      },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

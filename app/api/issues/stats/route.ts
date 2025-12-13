/**
 * Issues Stats API Route Handler
 * GET /api/issues/stats - Get aggregated issue statistics
 * 
 * @module app/api/issues/stats/route
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import {
  Issue,
  IssuePriority,
  IssueStatus,
  IssueEffort,
} from "@/server/models/Issue";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { getSessionOrNull } from "@/lib/auth/safe-session";

// ============================================================================
// GET /api/issues/stats
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const result = await getSessionOrNull(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for allowed roles
    const allowedRoles = ['super_admin', 'admin', 'developer'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Run all aggregations in parallel
    const [
      statusCounts,
      priorityCounts,
      categoryCounts,
      effortCounts,
      moduleCounts,
      quickWinsCount,
      staleCount,
      sprintReadyCount,
      blockedCount,
      recentlyResolved,
      timeline,
    ] = await Promise.all([
      // Status breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      
      // Priority breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      
      // Category breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      
      // Effort breakdown
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$effort', count: { $sum: 1 } } },
      ]),
      
      // Module breakdown (top 10)
      Issue.aggregate([
        { $match: { orgId } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      
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
      ]),
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
    
    return NextResponse.json(stats);
    
  } catch (error) {
    logger.error('[Issues Stats] Error fetching stats', { error });
    return NextResponse.json(
      { error: 'Failed to fetch issue stats' },
      { status: 500 }
    );
  }
}

/**
 * Issues Statistics API Route Handler
 * GET /api/issues/stats - Get comprehensive issue statistics
 * 
 * @module app/api/issues/stats/route
 */

import { NextRequest, NextResponse } from 'next/server';
import getServerSession from 'next-auth';
import mongoose from 'mongoose';
import Issue, { IssueStatus } from '@/models/issue';
// IssueCategory and IssuePriority are used by the Issue model for validation
// but not directly in this route's code
import { connectDB } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const orgId = new mongoose.Types.ObjectId(session.user.orgId);
    
    // Get basic stats
    const [
      basicStats,
      fileHeatMap,
      quickWins,
      staleIssues,
      categoryBreakdown,
      moduleBreakdown,
      recentActivity,
      resolutionTrend,
    ] = await Promise.all([
      // Basic counts
      Issue.getStats(orgId),
      
      // File heat map (top 10)
      Issue.getFileHeatMap(orgId, 10),
      
      // Quick wins
      Issue.getQuickWins(orgId),
      
      // Stale issues (> 7 days)
      Issue.getStaleIssues(orgId, 7),
      
      // Category breakdown (AUDIT-2025-12-18: Added maxTimeMS)
      Issue.aggregate([
        { $match: { orgId, status: { $ne: 'closed' } } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            p0: { $sum: { $cond: [{ $eq: ['$priority', 'P0'] }, 1, 0] } },
            p1: { $sum: { $cond: [{ $eq: ['$priority', 'P1'] }, 1, 0] } },
            p2: { $sum: { $cond: [{ $eq: ['$priority', 'P2'] }, 1, 0] } },
            p3: { $sum: { $cond: [{ $eq: ['$priority', 'P3'] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ], { maxTimeMS: 10_000 }),
      
      // Module breakdown
      Issue.aggregate([
        { $match: { orgId, status: { $ne: 'closed' } } },
        {
          $group: {
            _id: '$module',
            count: { $sum: 1 },
            bugs: { $sum: { $cond: [{ $eq: ['$category', 'bug'] }, 1, 0] } },
            logic: { $sum: { $cond: [{ $eq: ['$category', 'logic_error'] }, 1, 0] } },
            tests: { $sum: { $cond: [{ $eq: ['$category', 'missing_test'] }, 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ], { maxTimeMS: 10_000 }),
      
      // Recent activity (last 7 days)
      Issue.aggregate([
        {
          $match: {
            orgId,
            updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' },
            },
            created: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                  1,
                  0,
                ],
              },
            },
            resolved: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'resolved'] },
                  1,
                  0,
                ],
              },
            },
            updated: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ], { maxTimeMS: 10_000 }),
      
      // Resolution trend (last 30 days)
      Issue.aggregate([
        {
          $match: {
            orgId,
            resolvedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$resolvedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ], { maxTimeMS: 10_000 }),
    ]);
    
    // Calculate derived metrics
    const openIssues = basicStats.open + basicStats.inProgress;
    const criticalOpen = basicStats.p0 + basicStats.p1;
    const avgAge = await Issue.aggregate([
      { $match: { orgId, status: IssueStatus.OPEN } },
      {
        $group: {
          _id: null,
          avgAge: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$firstSeenAt'] },
                1000 * 60 * 60 * 24, // Convert to days
              ],
            },
          },
        },
      },
    ], { maxTimeMS: 10_000 });
    
    // Blocked items count
    const blockedCount = await Issue.countDocuments({
      orgId,
      $or: [
        { status: IssueStatus.BLOCKED },
        { blockedBy: { $exists: true, $ne: null } },
      ],
    });
    
    // Risk tag distribution
    const riskDistribution = await Issue.aggregate([
      { $match: { orgId, status: { $ne: 'closed' } } },
      { $unwind: '$riskTags' },
      {
        $group: {
          _id: '$riskTags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ], { maxTimeMS: 10_000 });
    
    // Assignee workload
    const assigneeWorkload = await Issue.aggregate([
      {
        $match: {
          orgId,
          status: { $in: ['open', 'in_progress'] },
          assignedTo: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          p0: { $sum: { $cond: [{ $eq: ['$priority', 'P0'] }, 1, 0] } },
          p1: { $sum: { $cond: [{ $eq: ['$priority', 'P1'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ], { maxTimeMS: 10_000 });
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total: basicStats.total,
          open: openIssues,
          resolved: basicStats.resolved,
          blocked: blockedCount,
          criticalOpen,
          quickWinsCount: quickWins.length,
          staleCount: staleIssues.length,
          avgAgeDays: avgAge[0]?.avgAge?.toFixed(1) || 0,
        },
        byPriority: {
          P0: basicStats.p0,
          P1: basicStats.p1,
          P2: basicStats.p2,
          P3: basicStats.p3,
        },
        byStatus: {
          open: basicStats.open,
          inProgress: basicStats.inProgress,
          resolved: basicStats.resolved,
          blocked: blockedCount,
        },
        byCategory: categoryBreakdown.map((c: any) => ({
          category: c._id,
          count: c.count,
          byPriority: { P0: c.p0, P1: c.p1, P2: c.p2, P3: c.p3 },
        })),
        byModule: moduleBreakdown.map((m: any) => ({
          module: m._id,
          count: m.count,
          bugs: m.bugs,
          logic: m.logic,
          tests: m.tests,
        })),
        fileHeatMap: fileHeatMap.map((f: any) => ({
          file: f._id,
          bugs: f.bugs,
          logic: f.logic,
          tests: f.tests,
          efficiency: f.efficiency,
          total: f.total,
        })),
        riskDistribution: riskDistribution.map((r: any) => ({
          tag: r._id,
          count: r.count,
        })),
        assigneeWorkload,
        quickWins: quickWins.slice(0, 10).map((q: any) => ({
          issueId: q.issueId,
          title: q.title,
          effort: q.effort,
          priority: q.priority,
          action: q.action,
        })),
        staleIssues: staleIssues.slice(0, 10).map((s: any) => ({
          issueId: s.issueId,
          title: s.title,
          firstSeenAt: s.firstSeenAt,
          daysPending: Math.floor((Date.now() - new Date(s.firstSeenAt).getTime()) / (1000 * 60 * 60 * 24)),
        })),
        trends: {
          recentActivity,
          resolutionTrend,
        },
        generatedAt: new Date().toISOString(),
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
    
  } catch (error) {
    console.error('GET /api/issues/stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Application } from '@/server/models/Application';
import { Job } from '@/server/models/Job';
import { Interview } from '@/server/models/ats/Interview';
import { atsRBAC } from '@/lib/ats/rbac';

import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';

/**
 * GET /api/ats/analytics - Get recruitment pipeline analytics
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    
    // RBAC: Check permissions for reading analytics
    const authResult = await atsRBAC(req, ['applications:read']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const jobId = searchParams.get('jobId');
    
    const periodDays = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // Build filter
    const filter: Record<string, unknown> = { 
      orgId,
      createdAt: { $gte: startDate }
    };
    if (jobId) filter.jobId = jobId;
    
    // Get applications by stage
    const applicationsByStage = await (Application as any).aggregate([
      { $match: filter },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    // Get total applications
    const totalApplications = await (Application as any).countDocuments(filter);
    
    // Get applications over time (last 7 days)
    const applicationsOverTime = await (Application as any).aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    
    // Get conversion rates
    const stageTransitions = await (Application as any).aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          applied: { $sum: { $cond: [{ $eq: ['$stage', 'applied'] }, 1, 0] } },
          screening: { $sum: { $cond: [{ $eq: ['$stage', 'screening'] }, 1, 0] } },
          interview: { $sum: { $cond: [{ $eq: ['$stage', 'interview'] }, 1, 0] } },
          offer: { $sum: { $cond: [{ $eq: ['$stage', 'offer'] }, 1, 0] } },
          hired: { $sum: { $cond: [{ $eq: ['$stage', 'hired'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$stage', 'rejected'] }, 1, 0] } }
        }
      }
    ]);
    
    const stages = stageTransitions[0] || {};
    const conversionRates = {
      appliedToScreening: stages.applied > 0 ? ((stages.screening / stages.applied) * 100).toFixed(1) : '0',
      screeningToInterview: stages.screening > 0 ? ((stages.interview / stages.screening) * 100).toFixed(1) : '0',
      interviewToOffer: stages.interview > 0 ? ((stages.offer / stages.interview) * 100).toFixed(1) : '0',
      offerToHired: stages.offer > 0 ? ((stages.hired / stages.offer) * 100).toFixed(1) : '0',
      overallConversion: stages.applied > 0 ? ((stages.hired / stages.applied) * 100).toFixed(1) : '0'
    };
    
    // Get average time in stage
    const avgTimeInStage = await (Application as any).aggregate([
      { $match: filter },
      {
        $project: {
          stage: 1,
          timeInStage: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      },
      {
        $group: {
          _id: '$stage',
          avgDays: { $avg: '$timeInStage' }
        }
      }
    ]);
    
    // Get top performing jobs
    const topJobs = await (Application as any).aggregate([
      { $match: { orgId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$jobId',
          applicationsCount: { $sum: 1 },
          avgScore: { $avg: '$score' }
        }
      },
      { $sort: { applicationsCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      {
        $project: {
          jobTitle: '$job.title',
          applicationsCount: 1,
          avgScore: { $round: ['$avgScore', 1] }
        }
      }
    ]);
    
    // Get interview statistics
    const interviewStats = await (Interview as any).aggregate([
      { $match: { orgId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalInterviews = await (Interview as any).countDocuments({
      orgId,
      createdAt: { $gte: startDate }
    });
    
    // Get active jobs count
    const activeJobs = await (Job as any).countDocuments({
      orgId,
      status: 'published'
    });
    
    return NextResponse.json({
      success: true,
      data: {
        period: periodDays,
        summary: {
          totalApplications,
          activeJobs,
          totalInterviews,
          hiredCount: stages.hired || 0
        },
        applicationsByStage: applicationsByStage.map((item: { _id: string; count: number }) => ({
          stage: item._id,
          count: item.count
        })),
        applicationsOverTime: applicationsOverTime.map((item: { _id: string; count: number }) => ({
          date: item._id,
          count: item.count
        })),
        conversionRates,
        avgTimeInStage: avgTimeInStage.map((item: { _id: string; avgDays: number }) => ({
          stage: item._id,
          avgDays: Math.round(item.avgDays * 10) / 10
        })),
        topJobs,
        interviewStats: interviewStats.map((item: { _id: string; count: number }) => ({
          status: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    logger.error('Analytics fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

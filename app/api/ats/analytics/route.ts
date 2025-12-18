/**
 * @fileoverview Recruitment Analytics Dashboard
 * @description Provides recruitment pipeline analytics including application metrics, interview stats, and hiring funnel data.
 * @route GET /api/ats/analytics - Retrieve recruitment analytics for specified period
 * @access Protected - Requires applications:read permission
 * @module ats
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from "@/server/models/Application";
import { Job } from "@/server/models/Job";
import { Interview } from "@/server/models/ats/Interview";
import { atsRBAC } from "@/lib/ats/rbac";
import { getCached, CacheTTL } from "@/lib/redis";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

/**
 * GET /api/ats/analytics - Get recruitment pipeline analytics
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    const runAggregate = async <T>(aggResult: unknown): Promise<T[]> => {
      const maybe = aggResult as {
        allowDiskUse?: (flag: boolean) => { maxTimeMS?: (ms: number) => Promise<T[]> } & Promise<T[]>;
      };
      if (maybe && typeof maybe.allowDiskUse === "function") {
        const withDisk = maybe.allowDiskUse(true);
        // Add timeout safety (30s max) to prevent long-running queries
        if (typeof withDisk.maxTimeMS === "function") {
          return (await withDisk.maxTimeMS(30_000)) ?? [];
        }
        return (await withDisk) ?? [];
      }
      return (await (aggResult as Promise<T[]>)) ?? [];
    };

    // RBAC: Check permissions for reading analytics
    const authResult = await atsRBAC(req, ["applications:read"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") || "30"; // days
    const jobId = searchParams.get("jobId");

    const period = Number.parseInt(periodParam, 10);
    if (!Number.isFinite(period) || period < 1 || period > 365) {
      return NextResponse.json(
        { success: false, error: "Invalid period parameter. Use 1-365 days." },
        { status: 400 },
      );
    }

    if (jobId && !Types.ObjectId.isValid(jobId)) {
      return NextResponse.json(
        { success: false, error: "Invalid jobId parameter" },
        { status: 400 },
      );
    }

    // Cache key: analytics:{orgId}:{period}:{jobId}
    const cacheKey = `analytics:${orgId}:${period}${jobId ? `:${jobId}` : ""}`;

    // Use cached data if available (5 minutes TTL)
    const analytics = await getCached(
      cacheKey,
      CacheTTL.FIVE_MINUTES,
      async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);

        // Build filter
        const filter: Record<string, unknown> = {
          orgId,
          createdAt: { $gte: startDate },
        };
        if (jobId) filter.jobId = new Types.ObjectId(jobId);

        // Get applications by stage
        // allowDiskUse prevents memory overflow for large orgs
        const applicationsByStage = await runAggregate<{ _id: string; count: number }>(
          Application.aggregate([
            { $match: filter },
            { $group: { _id: "$stage", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
        );

        // Get total applications
        const totalApplications = await Application.countDocuments(filter);

        // Get applications over time for the requested period
        // NOTE: Previously had hard-coded { $limit: 30 } which truncated data for longer periods
        // Now returns all days within the filter's date range
        const applicationsOverTime = await runAggregate<{ _id: string; count: number }>(
          Application.aggregate([
            { $match: filter },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            // Removed { $limit: 30 } - full period data now returned
          ]),
        );

        // Get conversion rates
        const stageTransitions = await runAggregate<{
          _id: null;
          applied: number;
          screening: number;
          interview: number;
          offer: number;
          hired: number;
          rejected: number;
        }>(
          Application.aggregate([
            { $match: filter },
            {
              $group: {
                _id: null,
                applied: {
                  $sum: { $cond: [{ $eq: ["$stage", "applied"] }, 1, 0] },
                },
                screening: {
                  $sum: { $cond: [{ $eq: ["$stage", "screening"] }, 1, 0] },
                },
                interview: {
                  $sum: { $cond: [{ $eq: ["$stage", "interview"] }, 1, 0] },
                },
                offer: {
                  $sum: { $cond: [{ $eq: ["$stage", "offer"] }, 1, 0] },
                },
                hired: {
                  $sum: { $cond: [{ $eq: ["$stage", "hired"] }, 1, 0] },
                },
                rejected: {
                  $sum: { $cond: [{ $eq: ["$stage", "rejected"] }, 1, 0] },
                },
              },
            },
          ]),
        );

        const stages = stageTransitions[0] || {};
        const conversionRates = {
          appliedToScreening:
            stages.applied > 0
              ? ((stages.screening / stages.applied) * 100).toFixed(1)
              : "0",
          screeningToInterview:
            stages.screening > 0
              ? ((stages.interview / stages.screening) * 100).toFixed(1)
              : "0",
          interviewToOffer:
            stages.interview > 0
              ? ((stages.offer / stages.interview) * 100).toFixed(1)
              : "0",
          offerToHired:
            stages.offer > 0
              ? ((stages.hired / stages.offer) * 100).toFixed(1)
              : "0",
          overallConversion:
            stages.applied > 0
              ? ((stages.hired / stages.applied) * 100).toFixed(1)
              : "0",
        };

        // Get average time in stage
        const avgTimeInStage = await runAggregate<{
          _id: string;
          avgDays: number;
        }>(
          Application.aggregate([
            { $match: filter },
            {
              $project: {
                stage: 1,
                timeInStage: {
                  $divide: [
                    { $subtract: [new Date(), "$createdAt"] },
                    1000 * 60 * 60 * 24, // Convert to days
                  ],
                },
              },
            },
            {
              $group: {
                _id: "$stage",
                avgDays: { $avg: "$timeInStage" },
              },
            },
          ]),
        );

        // Get top performing jobs
        // FIXED: Use consistent filter with jobId if provided (was previously org-wide only)
        // FIXED: Output shape now matches declared type (jobTitle instead of job.title)
        const topJobsFilter: Record<string, unknown> = {
          orgId,
          createdAt: { $gte: startDate },
        };
        if (jobId) topJobsFilter.jobId = new Types.ObjectId(jobId);

        const topJobs = await runAggregate<{
          _id: Types.ObjectId;
          applicationsCount: number;
          avgScore: number;
          jobTitle: string;
        }>(
          Application.aggregate([
            { $match: topJobsFilter },
            {
              $group: {
                _id: "$jobId",
                applicationsCount: { $sum: 1 },
                avgScore: { $avg: "$score" },
              },
            },
            { $sort: { applicationsCount: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "jobs",
                localField: "_id",
                foreignField: "_id",
                as: "job",
              },
            },
            { $unwind: "$job" },
            {
              $project: {
                jobTitle: "$job.title",
                applicationsCount: 1,
                avgScore: { $round: ["$avgScore", 1] },
              },
            },
          ]),
        );

        // Get interview statistics
        const interviewStats = await runAggregate<{
          _id: string;
          count: number;
        }>(
          Interview.aggregate([
            { $match: { orgId, createdAt: { $gte: startDate } } },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]),
        );

        const totalInterviews = await Interview.countDocuments({
          orgId,
          createdAt: { $gte: startDate },
        });

        // Get active jobs count
        const activeJobs = await Job.countDocuments({
          orgId,
          status: "published",
        });

        return {
          period,
          summary: {
            totalApplications,
            activeJobs,
            totalInterviews,
            hiredCount: stages.hired || 0,
          },
          applicationsByStage: applicationsByStage.map(
            (item: { _id: string; count: number }) => ({
              stage: item._id,
              count: item.count,
            }),
          ),
          applicationsOverTime: applicationsOverTime.map(
            (item: { _id: string; count: number }) => ({
              date: item._id,
              count: item.count,
            }),
          ),
          conversionRates,
          avgTimeInStage: avgTimeInStage.map(
            (item: { _id: string; avgDays: number }) => ({
              stage: item._id,
              avgDays: Math.round(item.avgDays * 10) / 10,
            }),
          ),
          topJobs,
          interviewStats: interviewStats.map(
            (item: { _id: string; count: number }) => ({
              status: item._id,
              count: item.count,
            }),
          ),
        };
      },
    );

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error(
      "Analytics fetch error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

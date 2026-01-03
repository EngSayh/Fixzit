/**
 * @fileoverview Superadmin Jobs API
 * @description GET background jobs status from scheduled tasks
 * @route GET /api/superadmin/jobs
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/jobs
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { ScheduledTask } from "@/server/models/ScheduledTask";
import { TaskExecution } from "@/server/models/TaskExecution";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/jobs
 * Get background jobs overview
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-jobs:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get all scheduled tasks with their status
    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const tasks = await ScheduledTask.find(query)
      .sort({ lastRunAt: -1, name: 1 })
      .lean();

    // Get recent executions (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide task executions
    const recentExecutions = await TaskExecution.find({
      startedAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ startedAt: -1 })
      .limit(100)
      .lean();

    // Calculate summary stats
    const summary = {
      total: tasks.length,
      enabled: tasks.filter(t => t.enabled).length,
      disabled: tasks.filter(t => !t.enabled).length,
      running: tasks.filter(t => t.status === "running").length,
      idle: tasks.filter(t => t.status === "idle").length,
      error: tasks.filter(t => t.status === "error").length,
      paused: tasks.filter(t => t.status === "paused").length,
    };

    // Execution stats for last 24 hours
    const executionStats = {
      total: recentExecutions.length,
      success: recentExecutions.filter(e => e.status === "success").length,
      failure: recentExecutions.filter(e => e.status === "failure").length,
      running: recentExecutions.filter(e => e.status === "running").length,
      pending: recentExecutions.filter(e => e.status === "pending").length,
    };

    // Format jobs for display
    const jobs = tasks.map(task => ({
      id: task._id,
      name: task.name,
      handler: task.handler,
      schedule: task.schedule,
      category: task.category,
      priority: task.priority,
      enabled: task.enabled,
      status: task.status,
      lastRunAt: task.lastRunAt,
      lastRunResult: task.lastRunResult,
      lastRunDuration: task.lastRunDuration,
      lastError: task.lastError,
      nextRunAt: task.nextRunAt,
      runCount: task.runCount,
      successCount: task.successCount,
      failureCount: task.failureCount,
      successRate: task.runCount > 0 
        ? Math.round((task.successCount / task.runCount) * 100) 
        : null,
    }));

    return NextResponse.json(
      {
        jobs,
        summary,
        executionStats,
        recentExecutions: recentExecutions.slice(0, 20).map(e => ({
          id: e._id,
          taskId: e.taskId,
          taskName: e.taskName,
          status: e.status,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
          duration: e.duration,
          triggeredBy: e.triggeredBy,
          error: e.error,
        })),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Jobs] Error fetching jobs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

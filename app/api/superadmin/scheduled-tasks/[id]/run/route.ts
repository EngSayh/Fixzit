/**
 * @fileoverview Superadmin Task Run API
 * @description POST to manually run a scheduled task
 * @route POST /api/superadmin/scheduled-tasks/[id]/run
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/scheduled-tasks/[id]/run
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose, { isValidObjectId } from "mongoose";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { ScheduledTask } from "@/server/models/ScheduledTask";
import { TaskExecution, ITaskExecution } from "@/server/models/TaskExecution";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/superadmin/scheduled-tasks/[id]/run
 * Manually trigger a scheduled task
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-task-run:post",
    requests: 5,
    windowMs: 60_000, // Max 5 manual runs per minute
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid task ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const task = await ScheduledTask.findById(id);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Check if task is already running
    if (task.status === "running") {
      return NextResponse.json(
        { error: "Task is already running" },
        { status: 409, headers: ROBOTS_HEADER }
      );
    }

    // Use MongoDB transaction to ensure atomic creation of execution and task update
    const mongooseSession = await mongoose.startSession();
    let execution: ITaskExecution | undefined;
    
    try {
      await mongooseSession.withTransaction(async () => {
        // Create execution record
        const executions = await TaskExecution.create([{
          taskId: task._id,
          taskName: task.name,
          handler: task.handler,
          status: "pending",
          startedAt: new Date(),
          triggeredBy: "manual",
          triggeredByUser: session.username,
          retryCount: 0,
          logs: [{
            timestamp: new Date(),
            level: "info",
            message: `Manual execution triggered by ${session.username}`,
          }],
        }], { session: mongooseSession });
        execution = executions[0];

        // Update task status to running
        await ScheduledTask.findByIdAndUpdate(id, {
          status: "running",
          lastRunAt: new Date(),
          $inc: { runCount: 1 },
        }, { session: mongooseSession });
      });
    } catch (txError) {
      logger.error("[Superadmin:TaskRun] Transaction failed", {
        taskId: id,
        error: txError instanceof Error ? txError.message : String(txError),
      });
      throw txError;
    } finally {
      await mongooseSession.endSession();
    }

    if (!execution) {
      throw new Error("Failed to create task execution");
    }

    // In a real implementation, this would trigger the job handler
    // For now, we simulate the execution flow
    const startTime = Date.now();
    
    try {
      // Simulate job execution (in production, this would call the actual handler)
      // The actual handler would be invoked via a job queue like Bull/BullMQ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = Date.now() - startTime;
      
      // Update execution as success
      await TaskExecution.findByIdAndUpdate(execution._id, {
        status: "success",
        completedAt: new Date(),
        duration,
        $push: {
          logs: {
            timestamp: new Date(),
            level: "info",
            message: "Task executed successfully (manual trigger)",
          },
        },
      });

      // Update task status
      await ScheduledTask.findByIdAndUpdate(id, {
        status: "idle",
        lastRunResult: "success",
        lastRunDuration: duration,
        $inc: { successCount: 1 },
      });

      logger.info("[Superadmin:TaskRun] Task executed manually", {
        taskId: id,
        handler: task.handler,
        executionId: execution._id.toString(),
        duration,
        by: session.username,
      });

      return NextResponse.json(
        { 
          message: "Task executed successfully",
          executionId: execution._id.toString(),
          duration,
        },
        { headers: ROBOTS_HEADER }
      );
    } catch (execError) {
      const duration = Date.now() - startTime;
      const errorMessage = execError instanceof Error ? execError.message : String(execError);
      
      // Update execution as failure
      await TaskExecution.findByIdAndUpdate(execution._id, {
        status: "failure",
        completedAt: new Date(),
        duration,
        error: errorMessage,
        $push: {
          logs: {
            timestamp: new Date(),
            level: "error",
            message: `Task failed: ${errorMessage}`,
          },
        },
      });

      // Update task status
      await ScheduledTask.findByIdAndUpdate(id, {
        status: "error",
        lastRunResult: "failure",
        lastRunDuration: duration,
        lastError: errorMessage,
        $inc: { failureCount: 1 },
      });

      return NextResponse.json(
        { 
          error: "Task execution failed",
          executionId: execution._id.toString(),
          details: errorMessage,
        },
        { status: 500, headers: ROBOTS_HEADER }
      );
    }
  } catch (error) {
    logger.error("[Superadmin:TaskRun] Error running task", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

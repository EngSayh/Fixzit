/**
 * @fileoverview Superadmin Scheduled Task by ID API
 * @description GET/PUT/DELETE individual scheduled task
 * @route GET/PUT/DELETE /api/superadmin/scheduled-tasks/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/scheduled-tasks/[id]
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { ScheduledTask } from "@/server/models/ScheduledTask";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const TASK_CATEGORIES = [
  "system",
  "billing",
  "notification",
  "cleanup",
  "sync",
  "report",
  "custom",
] as const;

const TASK_PRIORITIES = ["low", "normal", "high", "critical"] as const;

const UpdateTaskSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  schedule: z.string().min(9).max(100).optional(),
  enabled: z.boolean().optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().min(1000).max(3600000).optional(),
  retryOnFailure: z.boolean().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

/**
 * GET /api/superadmin/scheduled-tasks/[id]
 * Get a specific scheduled task
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-scheduled-task-id:get",
    requests: 30,
    windowMs: 60_000,
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

    const task = await ScheduledTask.findById(id).lean();
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { task },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:ScheduledTask] Error fetching task", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/scheduled-tasks/[id]
 * Update a scheduled task
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-scheduled-task-id:put",
    requests: 20,
    windowMs: 60_000,
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

    const body = await request.json();
    const validation = UpdateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check if it's a system task (limited edits allowed)
    const existing = await ScheduledTask.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // System tasks: only allow enabling/disabling and config changes
    if (existing.isSystem) {
      const allowedFields = ["enabled", "config", "timeout"];
      const updateFields = Object.keys(validation.data);
      const disallowedFields = updateFields.filter(f => !allowedFields.includes(f));
      
      if (disallowedFields.length > 0) {
        return NextResponse.json(
          { 
            error: `System tasks only allow modifying: ${allowedFields.join(", ")}`,
            disallowedFields,
          },
          { status: 403, headers: ROBOTS_HEADER }
        );
      }
    }

    const task = await ScheduledTask.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean();

    logger.info("[Superadmin:ScheduledTask] Task updated", {
      taskId: id,
      updates: Object.keys(validation.data),
      isSystem: existing.isSystem,
      by: session.username,
    });

    return NextResponse.json(
      { task, message: "Task updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:ScheduledTask] Error updating task", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/scheduled-tasks/[id]
 * Delete a scheduled task
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-scheduled-task-id:delete",
    requests: 10,
    windowMs: 60_000,
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

    // Check if it's a system task
    const existing = await ScheduledTask.findById(id).lean();
    if (existing?.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system tasks. You can disable them instead." },
        { status: 403, headers: ROBOTS_HEADER }
      );
    }

    const task = await ScheduledTask.findByIdAndDelete(id);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:ScheduledTask] Task deleted", {
      taskId: id,
      handler: task.handler,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:ScheduledTask] Error deleting task", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

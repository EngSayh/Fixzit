/**
 * @fileoverview Superadmin Scheduled Tasks API
 * @description GET/POST scheduled tasks with auto-seeding
 * @route GET/POST /api/superadmin/scheduled-tasks
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/scheduled-tasks
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { ScheduledTask } from "@/server/models/ScheduledTask";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

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

const CreateTaskSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  schedule: z.string().min(9).max(100), // Cron expression
  handler: z.string().min(1).max(200),
  enabled: z.boolean().optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().min(1000).max(3600000).optional(), // 1s to 1h
  retryOnFailure: z.boolean().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Default system tasks to seed
const DEFAULT_SYSTEM_TASKS = [
  {
    name: "Database Cleanup",
    description: "Remove expired sessions, tokens, and old audit logs",
    schedule: "0 3 * * *", // Daily at 3 AM
    handler: "jobs/database-cleanup",
    category: "cleanup" as const,
    priority: "normal" as const,
    isSystem: true,
    enabled: true,
    timeout: 600000, // 10 minutes
  },
  {
    name: "Subscription Renewal Check",
    description: "Check for expiring subscriptions and send notifications",
    schedule: "0 8 * * *", // Daily at 8 AM
    handler: "jobs/subscription-renewal",
    category: "billing" as const,
    priority: "high" as const,
    isSystem: true,
    enabled: true,
    timeout: 300000, // 5 minutes
  },
  {
    name: "Invoice Generation",
    description: "Generate monthly invoices for active subscriptions",
    schedule: "0 0 1 * *", // First of each month at midnight
    handler: "jobs/invoice-generation",
    category: "billing" as const,
    priority: "critical" as const,
    isSystem: true,
    enabled: true,
    timeout: 1800000, // 30 minutes
  },
  {
    name: "Email Queue Processor",
    description: "Process pending email queue",
    schedule: "*/5 * * * *", // Every 5 minutes
    handler: "jobs/email-queue",
    category: "notification" as const,
    priority: "normal" as const,
    isSystem: true,
    enabled: true,
    timeout: 120000, // 2 minutes
  },
  {
    name: "Analytics Aggregation",
    description: "Aggregate daily analytics data",
    schedule: "0 2 * * *", // Daily at 2 AM
    handler: "jobs/analytics-aggregation",
    category: "report" as const,
    priority: "low" as const,
    isSystem: true,
    enabled: true,
    timeout: 900000, // 15 minutes
  },
  {
    name: "External Sync",
    description: "Sync data with external services (ZATCA, etc.)",
    schedule: "0 */6 * * *", // Every 6 hours
    handler: "jobs/external-sync",
    category: "sync" as const,
    priority: "high" as const,
    isSystem: true,
    enabled: true,
    timeout: 600000, // 10 minutes
  },
];

async function seedDefaultTasks(): Promise<void> {
  try {
    const existingCount = await ScheduledTask.countDocuments({ isSystem: true });
    if (existingCount > 0) return;

    await ScheduledTask.insertMany(DEFAULT_SYSTEM_TASKS, { ordered: false });
    logger.info("[Superadmin:ScheduledTasks] Seeded default system tasks", {
      count: DEFAULT_SYSTEM_TASKS.length,
    });
  } catch (error) {
    // Ignore duplicate key errors
    if (error instanceof Error && !error.message.includes("duplicate key")) {
      logger.warn("[Superadmin:ScheduledTasks] Error seeding tasks", {
        error: error.message,
      });
    }
  }
}

/**
 * GET /api/superadmin/scheduled-tasks
 * List all scheduled tasks
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-scheduled-tasks:get",
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
    await seedDefaultTasks();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const enabled = searchParams.get("enabled");

    const query: Record<string, unknown> = {};
    if (category && TASK_CATEGORIES.includes(category as typeof TASK_CATEGORIES[number])) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }
    if (enabled !== null && enabled !== undefined) {
      query.enabled = enabled === "true";
    }

    const tasks = await ScheduledTask.find(query)
      .sort({ priority: -1, name: 1 })
      .lean();

    return NextResponse.json(
      { tasks, total: tasks.length },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:ScheduledTasks] Error fetching tasks", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/scheduled-tasks
 * Create a new scheduled task
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-scheduled-tasks:post",
    requests: 10,
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }
    const validation = CreateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check for duplicate handler
    const existing = await ScheduledTask.findOne({ handler: validation.data.handler });
    if (existing) {
      return NextResponse.json(
        { error: `Task with handler '${validation.data.handler}' already exists` },
        { status: 409, headers: ROBOTS_HEADER }
      );
    }

    const task = await ScheduledTask.create({
      ...validation.data,
      isSystem: false, // User-created tasks are never system tasks
      status: "idle",
      runCount: 0,
      successCount: 0,
      failureCount: 0,
    });

    logger.info("[Superadmin:ScheduledTasks] Task created", {
      taskId: task._id.toString(),
      handler: task.handler,
      schedule: task.schedule,
      by: session.username,
    });

    return NextResponse.json(
      { task, message: "Scheduled task created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:ScheduledTasks] Error creating task", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

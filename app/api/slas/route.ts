/**
 * @description Manages Service Level Agreement (SLA) definitions for work orders.
 * Supports creating SLA policies with response/resolution time targets,
 * uptime guarantees, and maintenance window configurations.
 * @route GET /api/slas - List SLA policies for the organization
 * @route POST /api/slas - Create a new SLA policy
 * @access Private - Authenticated users with SLA management permissions
 * @param {Object} body.name - SLA policy name
 * @param {Object} body.type - SLA type (RESPONSE_TIME, RESOLUTION_TIME, UPTIME, etc.)
 * @param {Object} body.category - Work order category this SLA applies to
 * @param {Object} body.priority - Priority level (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {Object} body.targets - Target metrics (responseTime, resolutionTime, uptime, etc.)
 * @returns {Object} GET: Array of SLA policies | POST: Created SLA policy
 * @throws {401} If user is not authenticated
 * @throws {429} If rate limit exceeded
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { z, ZodError } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

const createSLASchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum([
    "RESPONSE_TIME",
    "RESOLUTION_TIME",
    "UPTIME",
    "AVAILABILITY",
    "MAINTENANCE",
  ]),
  category: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  targets: z.object({
    responseTime: z.number().optional(), // hours
    resolutionTime: z.number().optional(), // hours
    uptime: z.number().min(0).max(100).optional(), // percentage
    availability: z.number().min(0).max(100).optional(), // percentage
    maintenanceWindow: z
      .object({
        enabled: z.boolean(),
        startTime: z.string().optional(), // HH:MM
        endTime: z.string().optional(), // HH:MM
        days: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  escalation: z
    .object({
      levels: z
        .array(
          z.object({
            level: z.number(),
            trigger: z.number(), // hours after start
            action: z.string(),
            recipients: z.array(z.string()),
            message: z.string().optional(),
          }),
        )
        .optional(),
      autoAssignment: z
        .object({
          enabled: z.boolean(),
          rules: z
            .array(
              z.object({
                condition: z.string(),
                assignTo: z.string(),
                priority: z.number(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
  metrics: z
    .object({
      targetResponseTime: z.number().optional(),
      targetResolutionTime: z.number().optional(),
      targetUptime: z.number().optional(),
      targetAvailability: z.number().optional(),
      penalties: z
        .object({
          responseTime: z.number().optional(),
          resolutionTime: z.number().optional(),
          downtime: z.number().optional(),
          perIncident: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  coverage: z
    .object({
      properties: z.array(z.string()).optional(),
      assets: z.array(z.string()).optional(),
      services: z.array(z.string()).optional(),
      locations: z
        .array(
          z.object({
            city: z.string(),
            region: z.string().optional(),
            radius: z.number().optional(),
          }),
        )
        .optional(),
      timeframes: z
        .array(
          z.object({
            start: z.string(),
            end: z.string(),
            days: z.array(z.string()),
          }),
        )
        .optional(),
    })
    .optional(),
  monitoring: z
    .object({
      enabled: z.boolean(),
      intervals: z
        .object({
          response: z.number().optional(),
          resolution: z.number().optional(),
          uptime: z.number().optional(),
        })
        .optional(),
      alerts: z
        .object({
          response: z.boolean().optional(),
          resolution: z.boolean().optional(),
          uptime: z.boolean().optional(),
          performance: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  reporting: z
    .object({
      frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
      recipients: z.array(z.string()).optional(),
      include: z
        .object({
          performance: z.boolean().optional(),
          incidents: z.boolean().optional(),
          trends: z.boolean().optional(),
          recommendations: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * @openapi
 * /api/slas:
 *   get:
 *     summary: slas operations
 *     tags: [slas]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing tenant context" },
        { status: 401 },
      );
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const data = createSLASchema.parse(await req.json());

    const { SLA } = await import("@/server/models/SLA");
    const sla = await SLA.create({
      tenantId: user.orgId,
      code: `SLA-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      ...data,
      status: "DRAFT",
      createdBy: user.id,
    });

    return createSecureResponse(sla, 201, req);
  } catch (error: unknown) {
    // Detect validation errors
    if (error instanceof ZodError) {
      return createSecureResponse(
        {
          error: "Invalid request payload",
          fields: error.issues.map((e) => String(e.path.join("."))),
        },
        400,
        req,
      );
    }

    // Log full error server-side
    logger.error(
      "SLA creation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    // Return generic error to client
    return createSecureResponse({ error: "Internal server error" }, 500, req);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user?.orgId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Missing tenant context" },
        { status: 401 },
      );
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: Record<string, unknown> = { tenantId: user.orgId };

    if (type) match.type = type;
    if (priority) match.priority = priority;
    if (status) match.status = status;
    if (search) {
      match.$text = { $search: search };
    }

    const { SLA } = await import("@/server/models/SLA");
    const [items, total] = await Promise.all([
      SLA.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SLA.countDocuments(match),
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    // Log full error server-side
    logger.error(
      "Failed to fetch SLAs:",
      error instanceof Error ? error.message : "Unknown error",
    );

    // Return generic error to client (no sensitive details)
    return createSecureResponse({ error: "Failed to fetch SLAs" }, 500, req);
  }
}

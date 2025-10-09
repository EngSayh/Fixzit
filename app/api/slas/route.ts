import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SLA } from "@/server/models/SLA";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const createSLASchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["RESPONSE_TIME", "RESOLUTION_TIME", "UPTIME", "AVAILABILITY", "MAINTENANCE"]),
  category: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  targets: z.object({
    responseTime: z.number().optional(), // hours
    resolutionTime: z.number().optional(), // hours
    uptime: z.number().min(0).max(100).optional(), // percentage
    availability: z.number().min(0).max(100).optional(), // percentage
    maintenanceWindow: z.object({
      enabled: z.boolean(),
      startTime: z.string().optional(), // HH:MM
      endTime: z.string().optional(), // HH:MM
      days: z.array(z.string()).optional()
    }).optional()
  }),
  escalation: z.object({
    levels: z.array(z.object({
      level: z.number(),
      trigger: z.number(), // hours after start
      action: z.string(),
      recipients: z.array(z.string()),
      message: z.string().optional()
    })).optional(),
    autoAssignment: z.object({
      enabled: z.boolean(),
      rules: z.array(z.object({
        condition: z.string(),
        assignTo: z.string(),
        priority: z.number()
      })).optional()
    }).optional()
  }).optional(),
  metrics: z.object({
    targetResponseTime: z.number().optional(),
    targetResolutionTime: z.number().optional(),
    targetUptime: z.number().optional(),
    targetAvailability: z.number().optional(),
    penalties: z.object({
      responseTime: z.number().optional(),
      resolutionTime: z.number().optional(),
      downtime: z.number().optional(),
      perIncident: z.number().optional()
    }).optional()
  }).optional(),
  coverage: z.object({
    properties: z.array(z.string()).optional(),
    assets: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    locations: z.array(z.object({
      city: z.string(),
      region: z.string().optional(),
      radius: z.number().optional()
    })).optional(),
    timeframes: z.array(z.object({
      start: z.string(),
      end: z.string(),
      days: z.array(z.string())
    })).optional()
  }).optional(),
  monitoring: z.object({
    enabled: z.boolean(),
    intervals: z.object({
      response: z.number().optional(),
      resolution: z.number().optional(),
      uptime: z.number().optional()
    }).optional(),
    alerts: z.object({
      response: z.boolean().optional(),
      resolution: z.boolean().optional(),
      uptime: z.boolean().optional(),
      performance: z.boolean().optional()
    }).optional()
  }).optional(),
  reporting: z.object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
    recipients: z.array(z.string()).optional(),
    include: z.object({
      performance: z.boolean().optional(),
      incidents: z.boolean().optional(),
      trends: z.boolean().optional(),
      recommendations: z.boolean().optional()
    }).optional()
  }).optional(),
  tags: z.array(z.string()).optional()
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
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const user = await getSessionUser(req);
  if (!user?.orgId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing tenant context' },
      { status: 401 }
    );
  }
    await connectToDatabase();

    const data = createSLASchema.parse(await req.json());

    const sla = await (SLA as any).create({
      tenantId: user.orgId,
      code: `SLA-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      status: "DRAFT",
      createdBy: user.id
    });

    return createSecureResponse(sla, 201, req);
  } catch (error: any) {
    return createSecureResponse({ error: error.message }, 400, req);
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const user = await getSessionUser(req);
  if (!user?.orgId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing tenant context' },
      { status: 401 }
    );
  }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.orgId };

    if (type) match.type = type;
    if (priority) match.priority = priority;
    if (status) match.status = status;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      (SLA as any).find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      (SLA as any).countDocuments(match)
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return createSecureResponse({ error: error.message }, 500, req);
  }
}



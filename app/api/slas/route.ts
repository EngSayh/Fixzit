import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { SLA } from "@/src/server/models/SLA";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

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

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

    const data = createSLASchema.parse(await req.json());

    const sla = await (SLA as any).create({
      tenantId: user.orgId,
      code: `SLA-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      status: "DRAFT",
      createdBy: user.id
    });

    return NextResponse.json(sla, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

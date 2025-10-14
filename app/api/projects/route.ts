import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Project } from "@/server/models/Project";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from '@/server/security/rateLimit';
import {zodValidationError, rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["NEW_CONSTRUCTION", "RENOVATION", "MAINTENANCE", "FIT_OUT", "DEMOLITION"]),
  propertyId: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  timeline: z.object({
    startDate: z.string(),
    endDate: z.string(),
    duration: z.number().optional()
  }),
  budget: z.object({
    total: z.number(),
    currency: z.string().default("SAR")
  }),
  tags: z.array(z.string()).optional()
});

/**
 * Create a new project for the authenticated tenant.
 *
 * Parses and validates the request JSON against `createProjectSchema`, ensures the caller is authenticated, connects to the database, and inserts a new Project document. The created project includes `tenantId` from the session, a generated `code` prefixed with `PRJ-` and the current timestamp, `status` set to `"PLANNING"`, an initialized `progress` object (overall, schedule, quality, cost = 0, `lastUpdated` set to now), and `createdBy` set to the authenticated user's id.
 *
 * Returns a 201 response with the created project on success. Possible responses:
 * - 401 Unauthorized when session retrieval fails.
 * - 422 Unprocessable Entity when request body fails schema validation (returns Zod flattened errors).
 * - 500 Internal Server Error for other failures.
 *
 * @returns A NextResponse containing the created project (201) or an error object with an appropriate status code.
 */
/**
 * @openapi
 * /api/projects:
 *   get:
 *     summary: projects operations
 *     tags: [projects]
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
    
    // Rate limiting AFTER authentication
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`${new URL(req.url).pathname}:${user.id}:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    if (!user?.orgId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing tenant context' },
        { status: 401 }
      );
    }
    await connectToDatabase();

    const data = createProjectSchema.parse(await req.json());

    const project = await Project.create({
      tenantId: user.orgId,
      code: `PRJ-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      status: "PLANNING",
      progress: {
        overall: 0,
        schedule: 0,
        quality: 0,
        cost: 0,
        lastUpdated: new Date()
      },
      createdBy: user.id
    });

    return createSecureResponse(project, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    const correlationId = crypto.randomUUID();
    console.error('[POST /api/projects] Error creating project:', {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return createSecureResponse({ error: "Internal server error", correlationId }, 500, req);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    
    // Rate limiting AFTER authentication
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = rateLimit(`${new URL(req.url).pathname}:${user.id}:${clientIp}`, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
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
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: Record<string, unknown> = { tenantId: user.orgId };

    if (type) match.type = type;
    if (status) match.status = status;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      Project.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Project.countDocuments(match)
    ]);

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error: unknown) {
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
    console.error(`[${correlationId}] Projects fetch failed:`, error);
    return createSecureResponse({ error: 'Failed to fetch projects', correlationId }, 500, req);
  }
}




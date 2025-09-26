import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { Project } from "@/src/server/models/Project";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

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
export async function POST(req: NextRequest) {
  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await db;

    const data = createProjectSchema.parse(await req.json());

    const project = await Project.create({
      tenantId: user.tenantId,
      code: `PRJ-${Date.now()}`,
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

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    let user;
    try {
      user = await getSessionUser(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await db;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.tenantId };

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
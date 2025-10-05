import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Project } from "@/server/models/Project";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

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
    const user = await getSessionUser(req);
    
    // If no user or missing required fields, return 401
    if (!user || !user.orgId) {
      console.error('POST /api/projects: Auth failed', { user, hasOrgId: !!user?.orgId });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await connectToDatabase();

    const data = createProjectSchema.parse(await req.json());

    const project = await Project.create({
      tenantId: (user as any)?.orgId,
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

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    // Check if error is authentication-related
    if (error.message?.includes('session') || error.message?.includes('auth')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    } catch (authError) {
      // Explicitly catch and normalize all auth errors to 401
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user || !(user as any)?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const match: any = { tenantId: (user as any)?.orgId };
    if (type) match.type = type;
    if (status) match.status = status;
    if (search) {
      // Only use $text if index exists, else fallback to regex (dev only) or empty
      const indexes = await Project.collection.indexes();
      const hasText = indexes.some(idx => idx.name === 'name_text_description_text');
      if (hasText) {
        match.$text = { $search: search };
      } else {
        // Fallback: regex search (dev only, not for prod)
        match.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
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
    // Normalize all auth errors to 401
    if (error.message?.includes('session') || error.message?.includes('auth')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


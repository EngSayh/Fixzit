import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { RFQ } from "@/server/models/RFQ";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import crypto from "crypto";

const createRFQSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  type: z.enum(["GOODS", "SERVICES", "WORKS"]).default("WORKS"),
  location: z.object({
    city: z.string(),
    region: z.string().optional(),
    address: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    radius: z.number().optional(),
    nationalAddress: z.string().optional()
  }),
  projectId: z.string().optional(),
  specifications: z.array(z.object({
    item: z.string(),
    description: z.string(),
    quantity: z.number(),
    unit: z.string(),
    specifications: z.any().optional()
  })).optional(),
  timeline: z.object({
    bidDeadline: z.string(),
    startDate: z.string(),
    completionDate: z.string()
  }),
  budget: z.object({
    estimated: z.number(),
    currency: z.string().default("SAR"),
    range: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional()
  }),
  requirements: z.object({
    qualifications: z.array(z.string()).optional(),
    experience: z.string().optional(),
    insurance: z.object({
      required: z.boolean(),
      minimum: z.number().optional()
    }).optional(),
    licenses: z.array(z.string()).optional(),
    references: z.number().optional()
  }).optional(),
  bidding: z.object({
    anonymous: z.boolean().default(true),
    maxBids: z.number().optional(),
    targetBids: z.number().default(3),
    bidLeveling: z.boolean().default(true),
    alternates: z.boolean().optional(),
    validity: z.number().default(30)
  }).optional(),
  compliance: z.object({
    cityBounded: z.boolean().optional(),
    insuranceRequired: z.boolean().optional(),
    licenseRequired: z.boolean().optional(),
    backgroundCheck: z.boolean().optional()
  }).optional(),
  tags: z.array(z.string()).optional()
});

/**
 * Create a new RFQ (Request for Quotation) from the incoming JSON payload.
 *
 * Validates the request body against the `createRFQSchema`, ensures a database
 * connection and a signed-in user session, and inserts a new RFQ document.
 * The created RFQ is assigned the tenant ID from the session, a generated
 * `code` (`RFQ-<timestamp>`), `status` set to `"DRAFT"`, `timeline` taken
 * directly from the validated input, and `workflow.createdBy` and
 * `createdBy` set to the session user's ID.
 *
 * @returns A NextResponse containing the created RFQ with status 201 on success,
 * or a JSON error message with status 400 if validation or creation fails.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const data = createRFQSchema.parse(await req.json());

    const rfq = await RFQ.create({
      tenantId: (user as any).orgId,
      code: `RFQ-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      status: "DRAFT",
      timeline: data.timeline,
      workflow: {
        createdBy: user.id
      },
      createdBy: user.id
    });

    return NextResponse.json(rfq, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const search = searchParams.get("search");

    const match: any = { tenantId: (user as any).orgId };

    if (status) match.status = status;
    if (category) match.category = category;
    if (city) match['location.city'] = city;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      RFQ.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      RFQ.countDocuments(match)
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


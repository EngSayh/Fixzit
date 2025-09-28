import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/src/lib/mongo";
import { RFQ } from "@/src/server/models/RFQ";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

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

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    await connectDb();

    const data = createRFQSchema.parse(await req.json());

    const rfq = await RFQ.create({
      tenantId: user.tenantId,
      code: `RFQ-${Date.now()}`,
      ...data,
      status: "DRAFT",
      timeline: {
        ...data.timeline,
        publishDate: new Date()
      },
      workflow: {
        createdBy: user.id
      },
      createdBy: user.id
    });

    return NextResponse.json(rfq, { status: 201 });
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
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.tenantId };

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
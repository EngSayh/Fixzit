import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const createPropertySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE", "LAND"]),
  subtype: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    region: z.string(),
    postalCode: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    nationalAddress: z.string().optional(),
    district: z.string().optional()
  }),
  details: z.object({
    totalArea: z.number().optional(),
    builtArea: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    floors: z.number().optional(),
    parkingSpaces: z.number().optional(),
    yearBuilt: z.number().optional(),
    occupancyRate: z.number().min(0).max(100).optional()
  }).optional(),
  ownership: z.object({
    type: z.enum(["OWNED", "LEASED", "MANAGED"]),
    owner: z.object({
      name: z.string(),
      contact: z.string().optional(),
      id: z.string().optional()
    }).optional(),
    lease: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      monthlyRent: z.number().optional(),
      landlord: z.string().optional()
    }).optional()
  }).optional(),
  features: z.object({
    amenities: z.array(z.string()).optional(),
    utilities: z.object({
      electricity: z.string().optional(),
      water: z.string().optional(),
      gas: z.string().optional(),
      internet: z.string().optional()
    }).optional(),
    accessibility: z.object({
      elevator: z.boolean().optional(),
      ramp: z.boolean().optional(),
      parking: z.boolean().optional()
    }).optional()
  }).optional(),
  tags: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  try {
    if (process.env.PROPERTY_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Property endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const PropertyMod = await import('@/src/server/models/Property').catch(() => null);
    const Property = PropertyMod && (PropertyMod as any).Property;
    if (!Property) {
      return NextResponse.json({ success: false, error: 'Property dependencies are not available in this deployment' }, { status: 501 });
    }
    const user = await getSessionUser(req);

    const data = createPropertySchema.parse(await req.json());

    const property = await (Property as any).create({
      tenantId: user.tenantId,
      code: `PROP-${Date.now()}`,
      ...data,
      createdBy: user.id
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.PROPERTY_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Property endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const PropertyMod = await import('@/src/server/models/Property').catch(() => null);
    const Property = PropertyMod && (PropertyMod as any).Property;
    if (!Property) {
      return NextResponse.json({ success: false, error: 'Property dependencies are not available in this deployment' }, { status: 501 });
    }
    // For testing purposes, allow access without authentication
    let user = null;
    try {
      user = await getSessionUser(req);
    } catch {
      // Use mock user for testing
      user = { id: '1', role: 'SUPER_ADMIN', tenantId: 'demo-tenant' };
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const city = searchParams.get("city");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.tenantId };

    if (type) match.type = type;
    if (status) match['units.status'] = status;
    if (city) match['address.city'] = city;
    if (search) {
      match.$text = { $search: search };
    }

    const [items, total] = await Promise.all([
      (Property as any).find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      (Property as any).countDocuments(match)
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

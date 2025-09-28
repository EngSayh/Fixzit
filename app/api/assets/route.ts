import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const createAssetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["HVAC", "ELECTRICAL", "PLUMBING", "SECURITY", "ELEVATOR", "GENERATOR", "FIRE_SYSTEM", "IT_EQUIPMENT", "VEHICLE", "OTHER"]),
  category: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  propertyId: z.string().min(1),
  location: z.object({
    building: z.string().optional(),
    floor: z.string().optional(),
    room: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  specs: z.object({
    capacity: z.string().optional(),
    powerRating: z.string().optional(),
    voltage: z.string().optional(),
    current: z.string().optional(),
    frequency: z.string().optional(),
    dimensions: z.string().optional(),
    weight: z.string().optional()
  }).optional(),
  purchase: z.object({
    date: z.string().optional(),
    cost: z.number().optional(),
    supplier: z.string().optional(),
    warranty: z.object({
      period: z.number().optional(),
      expiry: z.string().optional(),
      terms: z.string().optional()
    }).optional()
  }).optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"]).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  try {
    if (process.env.ASSET_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Asset endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await db;
    const AssetMod = await import('@/src/server/models/Asset').catch(() => null);
    const Asset = AssetMod && (AssetMod as any).Asset;
    if (!Asset) {
      return NextResponse.json({ success: false, error: 'Asset dependencies are not available in this deployment' }, { status: 501 });
    }
    const user = await getSessionUser(req);

    const data = createAssetSchema.parse(await req.json());

    const asset = await Asset.create({
      tenantId: user.tenantId,
      code: `AST-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      ...data,
      createdBy: user.id
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.ASSET_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'Asset endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const AssetMod = await import('@/src/server/models/Asset').catch(() => null);
    const Asset = AssetMod && (AssetMod as any).Asset;
    if (!Asset) {
      return NextResponse.json({ success: false, error: 'Asset dependencies are not available in this deployment' }, { status: 501 });
    }
    // Require authentication - no bypass allowed
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const propertyId = searchParams.get("propertyId");
    const search = searchParams.get("search");

    const match: any = { tenantId: user.tenantId };

    if (type) match.type = type;
    if (status) match.status = status;
    if (propertyId) match.propertyId = propertyId;
    if (search) {
      match.$text = { $search: search };
    }

    const items = (Asset as any).find(match)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = (Asset as any).countDocuments(match);

    const result = await Promise.all([items, total]);

    return NextResponse.json({
      items: result[0],
      page,
      limit,
      total: result[1],
      pages: Math.ceil(result[1] / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

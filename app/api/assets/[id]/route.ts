import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/mongo";
import { Asset } from "@/src/server/models/Asset";
import { z } from "zod";
import { getSessionUser } from "@/src/server/middleware/withAuthRbac";

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["HVAC", "ELECTRICAL", "PLUMBING", "SECURITY", "ELEVATOR", "GENERATOR", "FIRE_SYSTEM", "IT_EQUIPMENT", "VEHICLE", "OTHER"]).optional(),
  category: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  propertyId: z.string().min(1).optional(),
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
  status: z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"]).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tags: z.array(z.string()).optional()
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const asset = await Asset.findOne({
      _id: params.id,
      tenantId: user.tenantId
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('GET asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const data = updateAssetSchema.parse(await req.json());

    const asset = await Asset.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { ...data, updatedBy: user.id } },
      { new: true }
    );

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in (error as any)) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    console.error('PATCH asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    await db;

    const asset = await Asset.findOneAndUpdate(
      { _id: params.id, tenantId: user.tenantId },
      { $set: { status: "DECOMMISSIONED", updatedBy: user.id } },
      { new: true }
    );

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE asset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

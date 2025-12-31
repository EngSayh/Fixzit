/**
 * @fileoverview Property Unit API - Update unit metadata
 * @description API for updating individual units within a property.
 *
 * @route PATCH /api/fm/properties/[id]/units/[unitId] - Update unit metadata
 * @module api/fm/properties/[id]/units/[unitId]
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - PROPERTY:EDIT permission
 *
 * Features:
 * - Update unit metadata (meters, room counts, etc.)
 * - Multi-tenant isolation via orgId
 * - Audit logging
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { ModuleKey, SubmoduleKey } from "@/domain/fm/fm.types";
import { FMAction } from "@/types/fm/enums";
import { requireFmPermission } from "@/app/api/fm/permissions";
import { resolveTenantId } from "@/app/api/fm/utils/tenant";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { audit } from "@/lib/audit";

const PROPERTIES_COLLECTION = "properties";

// PATCH body schema
const UpdateUnitSchema = z.object({
  unitNumber: z.string().min(1).optional(),
  type: z.string().optional(),
  area: z.number().int().positive().optional(),
  sizeSqm: z.number().int().positive().optional(),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().int().min(0).optional(),
  halls: z.number().int().min(0).optional(),
  floor: z.string().optional(),
  status: z.string().optional(),
  electricityMeter: z.string().optional().nullable(),
  waterMeter: z.string().optional().nullable(),
  designKey: z.string().optional().nullable(),
  amenities: z.array(z.string()).optional(),
});

/**
 * GET /api/fm/properties/[id]/units/[unitId]
 * Get a specific unit
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "property-unit:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate IDs
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid property ID format" },
        { status: 400 }
      );
    }

    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.VIEW,
    });
    if (actor instanceof NextResponse) return actor;

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    const db = await getDatabase();

    // Find property
    const property = await db.collection(PROPERTIES_COLLECTION).findOne({
      _id: new ObjectId(params.id),
      orgId: tenantId,
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Find unit
    const units = property.units || [];
    const unit = units.find(
      (u: Record<string, unknown>) =>
        (u._id as ObjectId)?.toString() === params.unitId ||
        u.designKey === params.unitId
    );

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: (unit._id as ObjectId)?.toString(),
        unitNumber: unit.unitNumber,
        type: unit.type,
        area: unit.area,
        sizeSqm: unit.sizeSqm,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        halls: unit.halls,
        floor: unit.floor,
        status: unit.status,
        electricityMeter: unit.electricityMeter,
        waterMeter: unit.waterMeter,
        designKey: unit.designKey,
        amenities: unit.amenities,
      },
    });
  } catch (error) {
    logger.error("Error fetching unit:", { error });
    return NextResponse.json(
      { error: "Failed to fetch unit" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/fm/properties/[id]/units/[unitId]
 * Update a specific unit's metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "property-unit:update",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate IDs
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid property ID format" },
        { status: 400 }
      );
    }

    const actor = await requireFmPermission(req, {
      module: ModuleKey.PROPERTIES,
      submodule: SubmoduleKey.PROP_LIST,
      action: FMAction.UPDATE,
    });
    if (actor instanceof NextResponse) return actor;

    // RBAC: Only property_owner and agent roles can update units
    const allowedRoles = [
      "SUPER_ADMIN",
      "CORPORATE_ADMIN",
      "PROPERTY_OWNER",
      "CORPORATE_OWNER",
      "AGENT",
      "MANAGEMENT",
    ];
    if (!allowedRoles.includes(actor.role || "")) {
      return NextResponse.json(
        { error: "Insufficient permissions to update units" },
        { status: 403 }
      );
    }

    const tenantResolution = resolveTenantId(
      req,
      actor.orgId ?? actor.tenantId,
      {
        isSuperAdmin: actor.isSuperAdmin,
        userId: actor.userId,
        allowHeaderOverride: actor.isSuperAdmin,
      }
    );
    if ("error" in tenantResolution) return tenantResolution.error;
    const { tenantId } = tenantResolution;

    // Parse request body
    const bodyResult = await req.json().catch(() => null);
    if (!bodyResult) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const parseResult = UpdateUnitSchema.safeParse(bodyResult);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid unit data", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const updateData = parseResult.data;
    const db = await getDatabase();

    // Find property
    const property = await db.collection(PROPERTIES_COLLECTION).findOne({
      _id: new ObjectId(params.id),
      orgId: tenantId,
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Find and update unit
    const units = property.units || [];
    const unitIndex = units.findIndex(
      (u: Record<string, unknown>) =>
        (u._id as ObjectId)?.toString() === params.unitId ||
        u.designKey === params.unitId
    );

    if (unitIndex === -1) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Build update object
    const updateFields: Record<string, unknown> = {};
    if (updateData.unitNumber !== undefined) {
      updateFields[`units.${unitIndex}.unitNumber`] = updateData.unitNumber;
    }
    if (updateData.type !== undefined) {
      updateFields[`units.${unitIndex}.type`] = updateData.type;
    }
    if (updateData.area !== undefined) {
      updateFields[`units.${unitIndex}.area`] = updateData.area;
    }
    if (updateData.sizeSqm !== undefined) {
      updateFields[`units.${unitIndex}.sizeSqm`] = updateData.sizeSqm;
    }
    if (updateData.bedrooms !== undefined) {
      updateFields[`units.${unitIndex}.bedrooms`] = updateData.bedrooms;
    }
    if (updateData.bathrooms !== undefined) {
      updateFields[`units.${unitIndex}.bathrooms`] = updateData.bathrooms;
    }
    if (updateData.halls !== undefined) {
      updateFields[`units.${unitIndex}.halls`] = updateData.halls;
    }
    if (updateData.floor !== undefined) {
      updateFields[`units.${unitIndex}.floor`] = updateData.floor;
    }
    if (updateData.status !== undefined) {
      updateFields[`units.${unitIndex}.status`] = updateData.status;
    }
    if (updateData.electricityMeter !== undefined) {
      updateFields[`units.${unitIndex}.electricityMeter`] =
        updateData.electricityMeter;
    }
    if (updateData.waterMeter !== undefined) {
      updateFields[`units.${unitIndex}.waterMeter`] = updateData.waterMeter;
    }
    if (updateData.designKey !== undefined) {
      updateFields[`units.${unitIndex}.designKey`] = updateData.designKey;
    }
    if (updateData.amenities !== undefined) {
      updateFields[`units.${unitIndex}.amenities`] = updateData.amenities;
    }
    updateFields.updatedAt = new Date();

    // Update property
    await db.collection(PROPERTIES_COLLECTION).updateOne(
      { _id: new ObjectId(params.id), orgId: tenantId },
      { $set: updateFields }
    );

    // Get updated unit
    const updatedProperty = await db.collection(PROPERTIES_COLLECTION).findOne({
      _id: new ObjectId(params.id),
      orgId: tenantId,
    });
    const updatedUnit = updatedProperty?.units?.[unitIndex];

    // Audit log
    await audit({
      actorId: actor.userId ?? actor.id,
      actorEmail: actor.email ?? actor.userId ?? actor.id,
      actorRole: actor.role,
      action: "unit.update",
      target: params.unitId,
      targetType: "Unit",
      orgId: tenantId,
      success: true,
      meta: {
        propertyId: params.id,
        changes: updateData,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: (updatedUnit?._id as ObjectId)?.toString() ?? params.unitId,
        unitNumber: updatedUnit?.unitNumber,
        type: updatedUnit?.type,
        area: updatedUnit?.area,
        sizeSqm: updatedUnit?.sizeSqm,
        bedrooms: updatedUnit?.bedrooms,
        bathrooms: updatedUnit?.bathrooms,
        halls: updatedUnit?.halls,
        floor: updatedUnit?.floor,
        status: updatedUnit?.status,
        electricityMeter: updatedUnit?.electricityMeter,
        waterMeter: updatedUnit?.waterMeter,
        designKey: updatedUnit?.designKey,
        amenities: updatedUnit?.amenities,
      },
    });
  } catch (error) {
    logger.error("Error updating unit:", { error });
    return NextResponse.json(
      { error: "Failed to update unit" },
      { status: 500 }
    );
  }
}

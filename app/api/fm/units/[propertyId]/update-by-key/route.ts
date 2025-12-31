/**
 * @fileoverview Unit Update by Design Key API
 * @description API for updating unit metadata using the designKey from 3D models.
 *
 * @route PATCH /api/fm/units/[propertyId]/update-by-key - Update unit by designKey
 * @module api/fm/units/[propertyId]/update-by-key
 * @requires Authentication - Valid session with orgId
 * @requires Authorization - PROPERTY:UPDATE (owner/agent roles)
 *
 * Features:
 * - Update unit fields by designKey (stable 3D model link)
 * - Supports unitNumber, meters, room counts, size
 * - Multi-tenant isolation via orgId
 * - Audit logging for changes
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

export const runtime = "nodejs";

const PROPERTIES_COLLECTION = "properties";

// Allowed roles for unit updates
const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "CORPORATE_ADMIN",
  "PROPERTY_OWNER",
  "CORPORATE_OWNER",
  "AGENT",
  "MANAGEMENT",
];

// Request body schema
const UpdateUnitSchema = z
  .object({
    designKey: z.string().min(1),
    name: z.string().min(1).optional(),
    unitNumber: z.string().min(1).optional(),
    bedrooms: z.number().int().min(0).optional(),
    bathrooms: z.number().int().min(0).optional(),
    halls: z.number().int().min(0).optional(),
    sizeSqm: z.number().min(0).optional(),
    electricityMeter: z.string().min(1).optional(),
    waterMeter: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== "designKey"), {
    message: "No updates provided",
  });

/**
 * PATCH /api/fm/units/[propertyId]/update-by-key
 * Update a unit's metadata using its designKey (stable 3D model link)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "unit:update-by-key",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate property ID
    if (!ObjectId.isValid(params.propertyId)) {
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

    // RBAC check
    if (!ALLOWED_ROLES.includes(actor.role || "")) {
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
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { designKey, ...updates } = parseResult.data;
    const db = await getDatabase();

    // Find property and the unit with matching designKey
    const property = await db.collection(PROPERTIES_COLLECTION).findOne({
      _id: new ObjectId(params.propertyId),
      orgId: tenantId,
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Find the unit index
    const units = property.units || [];
    const unitIndex = units.findIndex(
      (u: Record<string, unknown>) => u.designKey === designKey
    );

    if (unitIndex === -1) {
      return NextResponse.json(
        { error: "Unit not found with the specified designKey" },
        { status: 404 }
      );
    }

    // Build update object
    const updateFields: Record<string, unknown> = {};
    const fieldMappings = [
      "name",
      "unitNumber",
      "bedrooms",
      "bathrooms",
      "halls",
      "sizeSqm",
      "electricityMeter",
      "waterMeter",
    ] as const;

    for (const field of fieldMappings) {
      if (updates[field] !== undefined) {
        updateFields[`units.${unitIndex}.${field}`] = updates[field];
      }
    }

    // Update the property document
    await db.collection(PROPERTIES_COLLECTION).updateOne(
      { _id: new ObjectId(params.propertyId), orgId: tenantId },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date(),
        },
      }
    );

    // Get updated unit
    const updatedProperty = await db.collection(PROPERTIES_COLLECTION).findOne({
      _id: new ObjectId(params.propertyId),
      orgId: tenantId,
    });
    const updatedUnit = updatedProperty?.units?.[unitIndex];

    // Audit log
    await audit({
      actorId: actor.userId ?? actor.id,
      actorEmail: actor.email ?? actor.userId ?? actor.id,
      actorRole: actor.role,
      action: "unit.update_from_3d",
      target: designKey,
      targetType: "Unit",
      orgId: tenantId,
      success: true,
      meta: {
        propertyId: params.propertyId,
        designKey,
        fields: Object.keys(updates),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        unit: updatedUnit
          ? {
              _id: updatedUnit._id?.toString?.() ?? `unit-${unitIndex}`,
              designKey: updatedUnit.designKey,
              unitNumber: updatedUnit.unitNumber,
              name: updatedUnit.name,
              bedrooms: updatedUnit.bedrooms,
              bathrooms: updatedUnit.bathrooms,
              halls: updatedUnit.halls,
              sizeSqm: updatedUnit.sizeSqm,
              electricityMeter: updatedUnit.electricityMeter,
              waterMeter: updatedUnit.waterMeter,
              floor: updatedUnit.floor,
              status: updatedUnit.status,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error("Error updating unit by designKey:", { error });
    return NextResponse.json(
      { error: "Failed to update unit" },
      { status: 500 }
    );
  }
}
